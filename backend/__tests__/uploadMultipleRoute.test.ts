/**
 * POST /api/upload/multiple (audit finding F-001): the product form uploads
 * gallery photos to this route, which did not exist, so every product photo
 * upload failed. Files go to a temporary local folder; no cloud storage.
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';

const TEST_DIR = `uploads-test-${process.pid}`;
process.env.UPLOAD_DIR = TEST_DIR;
process.env.MAX_FILE_SIZE_MB = '1';
delete process.env.SUPABASE_URL;
delete process.env.R2_ACCOUNT_ID;

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string; role: string } }).user = { id: 'seller-1', role: 'user' };
    next();
  },
}));

// Required after the environment is set, because the storage folder and size limit are read at import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const uploadRouter = require('../routes/upload');

const app = express();
app.use('/api/upload', uploadRouter);

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const htmlPretendingToBePng = Buffer.from('<html><script>alert(1)</script></html>');
const storedFiles = () => {
  const dir = path.join(process.cwd(), TEST_DIR);
  if (!fs.existsSync(dir)) return [] as string[];
  const out: string[] = [];
  const walk = (d: string) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else out.push(p); } };
  walk(dir);
  return out;
};

afterEach(() => fs.rmSync(path.join(process.cwd(), TEST_DIR), { recursive: true, force: true }));

describe('POST /api/upload/multiple', () => {
  it('stores every photo and answers their URLs in the order sent', async () => {
    const res = await request(app).post('/api/upload/multiple')
      .attach('files', png, { filename: 'front.png', contentType: 'image/png' })
      .attach('files', jpeg, { filename: 'back.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.files).toHaveLength(2);
    expect(res.body.files.map((f: { filename: string }) => f.filename)).toEqual(['front.png', 'back.jpg']);
    for (const f of res.body.files) expect(f.url).toMatch(/\/uploads\//);
    expect(storedFiles()).toHaveLength(2);
  });

  it('refuses the whole batch and keeps nothing when one file is not a real photo', async () => {
    const res = await request(app).post('/api/upload/multiple')
      .attach('files', png, { filename: 'ok.png', contentType: 'image/png' })
      .attach('files', htmlPretendingToBePng, { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body).toMatchObject({ code: 'MAGIC_BYTE_MISMATCH', index: 1 });
    expect(storedFiles()).toHaveLength(0);
  });

  it('refuses more than the per-request limit with a clear message', async () => {
    let req = request(app).post('/api/upload/multiple');
    for (let i = 0; i < 11; i++) req = req.attach('files', png, { filename: `p${i}.png`, contentType: 'image/png' });
    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at most 10 files/);
  });

  it('refuses a file over the size limit with 413', async () => {
    const big = Buffer.concat([png, Buffer.alloc(1024 * 1024 + 10)]);
    const res = await request(app).post('/api/upload/multiple').attach('files', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
  });

  it('asks for files when none are sent', async () => {
    const res = await request(app).post('/api/upload/multiple').field('note', 'nothing attached');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No files uploaded/);
  });
});

describe('POST /api/upload (single file) keeps working', () => {
  it('stores one photo', async () => {
    const res = await request(app).post('/api/upload').attach('file', png, { filename: 'one.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/\/uploads\//);
  });

  it('still refuses a disguised file', async () => {
    const res = await request(app).post('/api/upload').attach('file', htmlPretendingToBePng, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(storedFiles()).toHaveLength(0);
  });
});
