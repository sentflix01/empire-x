import pool from '../db/pool';
import { getRecord, listRecords, withoutProtectedFields } from '../utils/crud';

describe('generic CRUD real-mode reads', () => {
  const query = pool.query as jest.Mock;

  beforeEach(() => query.mockReset().mockResolvedValue({ rows: [] }));

  it('excludes seeded and demo owners from lists when Real mode is requested', async () => {
    await listRecords('businesses', { realOnly: true });

    expect(query.mock.calls[0][0]).toContain('businesses.owner_id IN');
    expect(query.mock.calls[0][0]).toContain('is_seed=FALSE AND is_demo=FALSE');
  });

  it('keeps default list behavior unchanged when no mode is requested', async () => {
    await listRecords('businesses');

    expect(query.mock.calls[0][0]).not.toContain('is_demo');
  });

  it('applies the same owner boundary to individual records', async () => {
    await getRecord('courses', 'course-id', { realOnly: true });

    expect(query.mock.calls[0][0]).toContain('courses.creator_id IN');
    expect(query.mock.calls[0][0]).toContain('is_seed=FALSE AND is_demo=FALSE');
  });

  it('removes ownership and immutable identity fields from editable payloads', () => {
    expect(withoutProtectedFields({
      id: 'other-id', created_at: '2000-01-01', updated_at: '2000-01-01', owner_id: 'attacker', business_name: 'Updated',
    }, 'owner_id')).toEqual({ business_name: 'Updated' });
    expect(withoutProtectedFields({ organizer_id: 'attacker', title: 'Updated' }, 'organizer_id'))
      .toEqual({ title: 'Updated' });
  });
});
