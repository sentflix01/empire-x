const mockNotices = new Map();
const mockDraft = {
  id: 'draft-1',
  title: 'Sample shop',
  sections: JSON.stringify([{ type: 'hero' }, { type: 'portfolio' }]),
  expires_at: null,
  email: 'owner@example.test',
};

jest.mock('../db/poolJsShim.cjs', () => ({
  query: jest.fn(async (sql, params = []) => {
    if (sql.includes('FROM business_subscriptions bs')) return { rows: [] };
    // Legacy Business profile emails (migrate59): none pending in these tests.
    if (sql.includes('legacy_migrated_at')) return { rows: [] };
    if (sql.includes('FROM showrooms s')) return { rows: [{ ...mockDraft }] };
    if (sql.includes('INSERT INTO showroom_draft_notices')) {
      const key = `${params[0]}:${params[1]}`;
      if (mockNotices.has(key)) return { rowCount: 0, rows: [] };
      mockNotices.set(key, false);
      return { rowCount: 1, rows: [{ showroom_id: params[0] }] };
    }
    if (sql.includes('UPDATE showroom_draft_notices SET sent_at')) {
      mockNotices.set(`${params[0]}:${params[1]}`, true);
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('SELECT sent_at FROM showroom_draft_notices')) {
      const noticeKey = params[1] ?? 'draft_72h';
      const key = `${params[0]}:${noticeKey}`;
      return { rows: mockNotices.has(key) ? [{ sent_at: mockNotices.get(key) ? new Date() : null }] : [] };
    }
    if (sql.includes('DELETE FROM showroom_draft_notices')) {
      mockNotices.delete(`${params[0]}:${params[1]}`);
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('DELETE FROM showrooms')) return { rowCount: 1, rows: [] };
    throw new Error(`Unexpected query in lifecycle test: ${sql}`);
  }),
}));
jest.mock('../lib/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const { runBusinessSubscriptionLifecycle, buildDraftNoticeHtml } = require('../scripts/business-subscription-lifecycle');
const pool = require('../db/poolJsShim.cjs');

describe('unpaid website draft reminders', () => {
  beforeEach(() => {
    mockNotices.clear();
    pool.query.mockClear();
  });

  it('sends reminders at 24h, 48h, and 72h, then deletes only after the final email', async () => {
    const now = new Date('2026-10-12T12:00:00Z');
    mockDraft.expires_at = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const sendEmail = jest.fn().mockResolvedValue(undefined);

    const first = await runBusinessSubscriptionLifecycle(now, { sendEmail });
    expect(first).toMatchObject({ draftNotices: 1, expiredDrafts: 0 });
    expect(sendEmail.mock.calls[0][1]).toContain('expires in 48 hours');

    const second = await runBusinessSubscriptionLifecycle(new Date(now.getTime() + 24 * 60 * 60 * 1000), { sendEmail });
    expect(second).toMatchObject({ draftNotices: 1, expiredDrafts: 0 });
    expect(sendEmail.mock.calls[1][1]).toContain('expires in 24 hours');

    const third = await runBusinessSubscriptionLifecycle(new Date(now.getTime() + 48 * 60 * 60 * 1000), { sendEmail });
    expect(third).toMatchObject({ draftNotices: 1, expiredDrafts: 1 });
    expect(sendEmail.mock.calls[2][1]).toContain('Final reminder');
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it('passes the clock as a timestamp, not an interval', async () => {
    await runBusinessSubscriptionLifecycle(new Date('2026-10-12T12:00:00Z'), { sendEmail: jest.fn() });
    const draftQuery = pool.query.mock.calls.find(([sql]) => sql.includes('FROM showrooms s'))[0];
    expect(draftQuery).toContain("$1::timestamptz + INTERVAL '48 hours'");
  });

  it('retains the draft if the final reminder email fails', async () => {
    const now = new Date('2026-10-12T12:00:00Z');
    mockDraft.expires_at = now;
    const sendEmail = jest.fn(async (_to, subject) => {
      if (subject.includes('Final reminder')) throw new Error('provider unavailable');
    });

    const result = await runBusinessSubscriptionLifecycle(now, { sendEmail });
    expect(result.expiredDrafts).toBe(0);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('DELETE FROM showrooms'))).toBe(false);
  });

  it('states the plan derived from selected section types and escapes user content', () => {
    const html = buildDraftNoticeHtml({
      title: '<Shop & Co>',
      sections: [{ type: 'hero' }, { type: 'portfolio' }],
    }, 48, 'https://example.test/draft');
    expect(html).toContain('Premium plan (500 ETB or USD $5 per month)');
    expect(html).toContain('&lt;Shop &amp; Co&gt;');
    expect(html).not.toContain('<Shop & Co>');
  });
});
