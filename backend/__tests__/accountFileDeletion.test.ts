/**
 * Deleting an account deletes the person's stored files (audit F-014):
 * collectUserFileRefs finds them, deleteStoredFiles removes them.
 */
import fs from 'fs';
import path from 'path';

const PRIVATE_DIR = `private-uploads-deltest-${process.pid}`;
const PUBLIC_DIR = `uploads-deltest-${process.pid}`;
process.env.PRIVATE_UPLOAD_DIR = PRIVATE_DIR;
process.env.UPLOAD_DIR = PUBLIC_DIR;
process.env.API_URL = 'http://api.test';
delete process.env.SUPABASE_URL;
delete process.env.R2_ACCOUNT_ID;

/* eslint-disable @typescript-eslint/no-require-imports */
const { storePrivateFile } = require('../lib/privateFiles');
const { deleteStoredFiles } = require('../lib/storedFiles');
const { collectUserFileRefs } = require('../lib/accountData');
/* eslint-enable @typescript-eslint/no-require-imports */

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

afterAll(() => {
  for (const d of [PRIVATE_DIR, PUBLIC_DIR]) fs.rmSync(path.join(process.cwd(), d), { recursive: true, force: true });
});

describe('deleteStoredFiles', () => {
  it('deletes private files and this app\'s public uploads, ignores other URLs, and never throws', async () => {
    const privateRef: string = await storePrivateFile('verification/user-x', png, 'image/png');
    const privatePath = path.join(process.cwd(), PRIVATE_DIR, ...privateRef.replace('private:', '').split('/'));
    const publicPath = path.join(process.cwd(), PUBLIC_DIR, 'avatar-1.png');
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.writeFileSync(publicPath, png);

    const report = await deleteStoredFiles([
      privateRef,
      'http://api.test/uploads/avatar-1.png',
      'https://images.example.com/not-ours.jpg',
      privateRef, // duplicates are deleted once
      null,
      'http://api.test/uploads/../../etc/passwd', // never escapes the uploads folder
    ]);

    expect(fs.existsSync(privatePath)).toBe(false);
    expect(fs.existsSync(publicPath)).toBe(false);
    expect(report).toEqual({ deleted: 2, external: 2, failed: 0 });
  });
});

describe('collectUserFileRefs', () => {
  it('reads only existing file columns for the user and removes duplicates', async () => {
    const db = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        if (sql.includes('information_schema.columns')) {
          // Pretend stories.media_url does not exist in this schema.
          return { rows: params[0] === 'stories' ? [] : [{ '?column?': 1 }] };
        }
        if (sql.includes('FROM verification_requests') && sql.includes('selfie_url')) return { rows: [{ ref: 'private:verification/u1/a.jpg' }] };
        if (sql.includes('FROM user_profiles') && sql.includes('avatar_url')) return { rows: [{ ref: 'http://api.test/uploads/a.png' }] };
        if (sql.includes('FROM posts')) return { rows: [{ ref: 'http://api.test/uploads/a.png' }, { ref: 'http://api.test/uploads/p.png' }] };
        if (sql.includes('FROM messages')) {
          expect(sql).toContain("type IN ('image','file')");
          return { rows: [{ ref: 'http://api.test/uploads/chat.jpg' }] };
        }
        return { rows: [] };
      }),
    };
    const refs = await collectUserFileRefs(db, 'u1');
    expect(refs.sort()).toEqual([
      'http://api.test/uploads/a.png',
      'http://api.test/uploads/chat.jpg',
      'http://api.test/uploads/p.png',
      'private:verification/u1/a.jpg',
    ]);
    const queried = db.query.mock.calls.map(([sql]) => String(sql));
    expect(queried.some((sql) => sql.includes('FROM stories'))).toBe(false);
    for (const [sql, params] of db.query.mock.calls) if (!String(sql).includes('information_schema')) expect(params).toEqual(['u1']);
  });
});
