/**
 * Identity documents are private (audit F-013): they are stored outside the
 * public uploads, referenced as "private:…", and viewable only by their owner
 * or an admin through links that expire. Local private storage in a temp folder.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import pool from '../db/pool';

const PRIVATE_DIR = `private-uploads-test-${process.pid}`;
process.env.PRIVATE_UPLOAD_DIR = PRIVATE_DIR;
process.env.API_URL = 'http://api.test';
delete process.env.SUPABASE_URL;
delete process.env.PRIVATE_SUPABASE_BUCKET;
delete process.env.RECEIPTS_SUPABASE_BUCKET;

jest.mock('../middleware/auth', () => {
  const asUser = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string; role: string } }).user = {
      id: req.header('x-user-id') ?? 'user-a', role: req.header('x-user-role') ?? 'user',
    };
    next();
  };
  return {
    requireAuth: asUser,
    requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) =>
      ((req as express.Request & { user?: { role: string } }).user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required' })),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const verificationRouter = require('../routes/verification');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const privateFilesRouter = require('../routes/privateFiles');

const app = express();
app.use(express.json());
app.use('/api/verification', verificationRouter);
app.use('/api/private-files', privateFilesRouter);

const mockQuery = (pool as unknown as { query: jest.Mock }).query;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const html = Buffer.from('<html><script>alert(1)</script></html>');
const REQUEST_ID = '11111111-2222-4333-8444-555555555555';

async function uploadDoc(kind: 'selfie' | 'id', user = 'user-a') {
  return request(app).post('/api/verification/documents').set('x-user-id', user)
    .field('kind', kind).attach('file', png, { filename: `${kind}.png`, contentType: 'image/png' });
}

afterEach(() => {
  mockQuery.mockReset();
  fs.rmSync(path.join(process.cwd(), PRIVATE_DIR), { recursive: true, force: true });
});

describe('POST /api/verification/documents', () => {
  it('stores the document privately and returns a reference, not a URL', async () => {
    const res = await uploadDoc('id');
    expect(res.status).toBe(201);
    expect(res.body.ref).toMatch(/^private:verification\/user-a\/[0-9a-f-]{36}\.png$/);
    expect(JSON.stringify(res.body)).not.toMatch(/https?:\/\//);
    const stored = path.join(process.cwd(), PRIVATE_DIR, ...res.body.ref.replace('private:', '').split('/'));
    expect(fs.existsSync(stored)).toBe(true);
  });

  it('refuses a file whose content is not what it claims', async () => {
    const res = await request(app).post('/api/verification/documents').field('kind', 'selfie')
      .attach('file', html, { filename: 'me.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
  });

  it('requires a valid kind', async () => {
    const res = await request(app).post('/api/verification/documents').field('kind', 'passport')
      .attach('file', png, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/verification/request', () => {
  it('refuses public URLs', async () => {
    const res = await request(app).post('/api/verification/request')
      .send({ selfie_url: 'https://cdn.example/selfie.jpg', id_document_url: 'https://cdn.example/id.jpg' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("refuses another person's documents", async () => {
    const selfie = (await uploadDoc('selfie', 'user-b')).body.ref;
    const id = (await uploadDoc('id', 'user-b')).body.ref;
    const res = await request(app).post('/api/verification/request').set('x-user-id', 'user-a')
      .send({ selfie_ref: selfie, id_document_ref: id });
    expect(res.status).toBe(400);
  });

  it('accepts own references and never returns them', async () => {
    const selfie = (await uploadDoc('selfie')).body.ref;
    const id = (await uploadDoc('id')).body.ref;
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no earlier request
      .mockResolvedValueOnce({ rows: [{ id: REQUEST_ID, user_id: 'user-a', status: 'pending', selfie_url: selfie, id_document_url: id }] });
    const res = await request(app).post('/api/verification/request').send({ selfie_ref: selfie, id_document_ref: id });
    expect(res.status).toBe(201);
    expect(mockQuery.mock.calls[1][1]).toEqual(['user-a', 'personal', selfie, id, null, null]);
    expect(res.body).toMatchObject({ has_selfie: true, has_id_document: true });
    expect(res.body.selfie_url).toBeUndefined();
    expect(res.body.id_document_url).toBeUndefined();
  });
});

describe('GET /api/verification/:id/documents', () => {
  async function rowWithDocs(owner = 'user-a') {
    const selfie = (await uploadDoc('selfie', owner)).body.ref;
    const id = (await uploadDoc('id', owner)).body.ref;
    mockQuery.mockResolvedValue({ rows: [{ user_id: owner, selfie_url: selfie, id_document_url: id }] });
  }
  const pathOf = (url: string) => url.replace('http://api.test', '');

  it('gives the owner links that serve the file and expire', async () => {
    await rowWithDocs();
    const res = await request(app).get(`/api/verification/${REQUEST_ID}/documents`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.body.id_document.expires_in).toBe(300);
    const file = await request(app).get(pathOf(res.body.id_document.url));
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toMatch(/image\/png/);
    expect(file.headers['cache-control']).toMatch(/no-store/);
  });

  it('gives an admin links too', async () => {
    await rowWithDocs();
    const res = await request(app).get(`/api/verification/${REQUEST_ID}/documents`).set('x-user-id', 'admin-1').set('x-user-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.selfie.url).toMatch(/\/api\/private-files\//);
  });

  it('answers 404 to anyone else', async () => {
    await rowWithDocs();
    const res = await request(app).get(`/api/verification/${REQUEST_ID}/documents`).set('x-user-id', 'user-c');
    expect(res.status).toBe(404);
  });

  it('refuses tampered and expired links', async () => {
    await rowWithDocs();
    const { body } = await request(app).get(`/api/verification/${REQUEST_ID}/documents`);
    const link = pathOf(body.id_document.url);
    expect((await request(app).get(link.replace(/signature=[^&]+/, 'signature=AAAA'))).status).toBe(404);
    expect((await request(app).get(link.replace(/expires=\d+/, 'expires=1000'))).status).toBe(404);
    expect((await request(app).get(link.split('?')[0])).status).toBe(404);
  });

  it('flags old public URLs as legacy until they are migrated', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 'user-a', selfie_url: 'https://cdn.example/old-selfie.jpg', id_document_url: null }] });
    const res = await request(app).get(`/api/verification/${REQUEST_ID}/documents`);
    expect(res.body).toEqual({ selfie: { url: 'https://cdn.example/old-selfie.jpg', legacy: true }, id_document: null });
  });
});
