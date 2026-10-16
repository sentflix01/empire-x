import fs from 'fs';
import path from 'path';

describe('real admin account is never marked demo', () => {
  it('migrate39 no longer lists admin@nodbusiness.app', () => {
    const src = fs.readFileSync(path.join(__dirname, '../db/migrate39.js'), 'utf8');
    const update = src.slice(src.indexOf('UPDATE users'), src.indexOf('CREATE INDEX'));
    expect(update).not.toContain('admin@nodbusiness.app');
    expect(update).toContain('test@nodbusiness.app');
  });

  it('migrate53 only clears the flag on the non-seed admin row', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const migrate53 = require('../db/migrate53.js');
    const query = jest.fn().mockResolvedValue({ rowCount: 1 });
    await migrate53({ query });
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toMatch(/SET is_demo = FALSE/);
    expect(sql).toMatch(/email = 'admin@nodbusiness.app'/);
    expect(sql).toMatch(/role = 'admin'/);
    expect(sql).toMatch(/is_seed = FALSE/);
  });
});
