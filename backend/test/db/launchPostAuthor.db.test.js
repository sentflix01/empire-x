'use strict';

/**
 * Automatic "<site> is now live" posts carry the author's name and picture
 * (the feed showed "Unknown"), and migrate80 fills them in on older posts.
 * Real Postgres.
 */
const { pool, createUser, createPublicBusiness, deleteUser } = require('./helpers');
const { announceShowroomPublished } = require('../../lib/showroomAnnouncement');
const migrate80 = require('../../db/migrate80');

let owner; let biz;
beforeAll(async () => {
  owner = await createUser();
  await pool.query(`UPDATE user_profiles SET display_name='Sara Worku', avatar_url='https://img.example/sara.jpg' WHERE user_id=$1`, [owner.id]);
  biz = await createPublicBusiness(owner.id);
});
afterAll(async () => { await deleteUser(owner.id); });

describe('launch post author', () => {
  it('stores the owner\'s name and picture on the announcement', async () => {
    const created = await announceShowroomPublished({ id: biz.siteId, owner_id: owner.id, title: 'Meda Pharmacy', slug: biz.slug, description: 'Open daily' });
    expect(created).toBe(true);
    const { rows: [post] } = await pool.query('SELECT author_name, author_avatar FROM posts WHERE showroom_id=$1', [biz.siteId]);
    expect(post).toEqual({ author_name: 'Sara Worku', author_avatar: 'https://img.example/sara.jpg' });
  });

  it('migrate80 fills in posts written without an author, and only those', async () => {
    const { rows: [blank] } = await pool.query(
      `INSERT INTO posts (author_id, content, post_type) VALUES ($1, 'old launch post', 'text') RETURNING id`, [owner.id]);
    const { rows: [named] } = await pool.query(
      `INSERT INTO posts (author_id, author_name, content, post_type) VALUES ($1, 'Kept Name', 'named post', 'text') RETURNING id`, [owner.id]);

    await migrate80(pool);

    const get = async (id) => (await pool.query('SELECT author_name, author_avatar FROM posts WHERE id=$1', [id])).rows[0];
    expect(await get(blank.id)).toEqual({ author_name: 'Sara Worku', author_avatar: 'https://img.example/sara.jpg' });
    expect((await get(named.id)).author_name).toBe('Kept Name');
    expect((await get(named.id)).author_avatar).toBe('https://img.example/sara.jpg');
  });
});
