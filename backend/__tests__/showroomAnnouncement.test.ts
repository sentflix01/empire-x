import pool from '../db/pool';
import { announceShowroomPublished } from '../lib/showroomAnnouncement';

const query = (pool as unknown as { query: jest.Mock }).query;
const showroom = { id: 'sr-1', owner_id: 'owner-1', slug: 'abebe coffee', title: 'Abebe Coffee', description: 'Fresh beans', cover_image: 'https://cdn.example/c.jpg' };

beforeEach(() => query.mockReset());

describe('announceShowroomPublished', () => {
  it('creates one linked post and notifies followers', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'post-1' }] }).mockResolvedValueOnce({ rowCount: 3 });
    await expect(announceShowroomPublished(showroom)).resolves.toBe(true);
    const [postSql, postParams] = query.mock.calls[0];
    expect(postSql).toMatch(/ON CONFLICT \(showroom_id\)/);
    expect(postParams).toEqual(['owner-1', 'Abebe Coffee is now live on Nodbusiness.\n\nFresh beans', 'https://cdn.example/c.jpg', '/showroom/abebe%20coffee', 'sr-1']);
    expect(query.mock.calls[1][0]).toMatch(/FROM follows f WHERE f.followed_id = \$1/);
  });

  it('does not notify again when the showroom was already announced', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(announceShowroomPublished(showroom)).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('never throws, so publishing cannot fail because of it', async () => {
    query.mockRejectedValueOnce(new Error('db down'));
    await expect(announceShowroomPublished(showroom)).resolves.toBe(false);
  });
});
