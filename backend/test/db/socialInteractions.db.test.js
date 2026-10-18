'use strict';

/**
 * People-first interactions against real Postgres: reactions, "who reacted",
 * not interested, mute, block (both ways), who can comment, restrict, comment
 * edit/reactions, pin, hide like count, privacy and who can message me.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', require('../../routes/posts'));
  app.use('/api/social', require('../../routes/social'));
  app.use('/api/profiles', require('../../routes/profiles'));
  app.use('/api/messages', require('../../routes/messages'));
  return app;
}

let app; let alice; let bob; let carol;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const post = async (user, content, extra = {}) => {
  const res = await request(app).post('/api/posts').set(auth(user)).send({ content, ...extra });
  expect(res.status).toBe(201);
  return res.body;
};
const listAuthor = (viewer, authorId) => request(app).get(`/api/posts?author_id=${authorId}`).set(auth(viewer));
const ids = (res) => res.body.posts.map((p) => p.id);

beforeAll(async () => {
  app = buildApp();
  [alice, bob, carol] = [await createUser(), await createUser(), await createUser()];
});
afterAll(async () => { for (const u of [alice, bob, carol]) await deleteUser(u.id); });

describe('reactions', () => {
  it('one reaction per person: add, change, remove; counts follow', async () => {
    const p = await post(alice, 'Reactions please');
    let res = await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(bob)).send({ reaction: '😂' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ my_reaction: '😂', like_count: 1, top_reactions: ['😂'] });
    res = await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(bob)).send({ reaction: '🔥' });
    expect(res.body).toMatchObject({ my_reaction: '🔥', like_count: 1 });
    await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(carol)).send({ reaction: '🔥' });
    res = await request(app).get(`/api/posts/${p.id}/reactions`).set(auth(alice));
    expect(res.body.counts).toEqual({ '🔥': 2 });
    expect(res.body.people.map((x) => x.user_id).sort()).toEqual([bob.id, carol.id].sort());
    res = await request(app).delete(`/api/posts/${p.id}/reaction`).set(auth(bob));
    expect(res.body).toMatchObject({ my_reaction: null, like_count: 1 });
    expect((await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(bob)).send({ reaction: '💩' })).status).toBe(422);
  });

  it('the old like toggle still works and becomes ❤️', async () => {
    const p = await post(alice, 'Old like button');
    expect((await request(app).post(`/api/posts/${p.id}/like`).set(auth(bob))).body.liked).toBe(true);
    const list = await listAuthor(bob, alice.id);
    expect(list.body.posts.find((x) => x.id === p.id)).toMatchObject({ my_reaction: '❤️', liked_by_me: true });
  });

  it('people who hide their reactions are counted but not listed', async () => {
    const p = await post(alice, 'Quiet reactor');
    await pool.query('UPDATE user_profiles SET show_reactions=FALSE WHERE user_id=$1', [carol.id]);
    await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(carol)).send({ reaction: '👍' });
    const res = await request(app).get(`/api/posts/${p.id}/reactions`).set(auth(alice));
    expect(res.body.like_count).toBe(1);
    expect(res.body.people).toEqual([]);
    await pool.query('UPDATE user_profiles SET show_reactions=TRUE WHERE user_id=$1', [carol.id]);
  });

  it('an owner can hide the like count from others', async () => {
    const p = await post(alice, 'Hidden count');
    await request(app).put(`/api/posts/${p.id}/reaction`).set(auth(bob)).send({ reaction: '❤️' });
    expect((await request(app).put(`/api/posts/${p.id}/settings`).set(auth(alice)).send({ hide_like_count: true })).status).toBe(200);
    expect((await listAuthor(bob, alice.id)).body.posts.find((x) => x.id === p.id).like_count).toBeNull();
    expect((await listAuthor(alice, alice.id)).body.posts.find((x) => x.id === p.id).like_count).toBe(1);
    expect((await request(app).put(`/api/posts/${p.id}/settings`).set(auth(bob)).send({ hide_like_count: false })).status).toBe(403);
  });
});

describe('viewer controls', () => {
  it('"Not interested" hides a post from my feed only, with Undo', async () => {
    const p = await post(alice, 'Maybe not for you');
    await request(app).post(`/api/posts/${p.id}/hide`).set(auth(bob));
    expect(ids(await listAuthor(bob, alice.id))).not.toContain(p.id);
    expect(ids(await listAuthor(carol, alice.id))).toContain(p.id);
    await request(app).delete(`/api/posts/${p.id}/hide`).set(auth(bob));
    expect(ids(await listAuthor(bob, alice.id))).toContain(p.id);
  });

  it('mute removes someone’s posts from my feed without telling them', async () => {
    const p = await post(alice, 'Muted words');
    await request(app).put(`/api/social/mute/${alice.id}`).set(auth(bob));
    expect(ids(await request(app).get('/api/posts?feed=true').set(auth(bob)))).not.toContain(p.id);
    expect((await request(app).get(`/api/social/relationship/${bob.id}`).set(auth(alice))).body).toMatchObject({ muted: false, blocked_me: false });
    await request(app).delete(`/api/social/mute/${alice.id}`).set(auth(bob));
    expect(ids(await request(app).get('/api/posts?feed=true').set(auth(bob)))).toContain(p.id);
  });

  it('block works both ways: posts, comments, follows and messages', async () => {
    const p = await post(alice, 'Blocked people can’t see this');
    await request(app).post(`/api/profiles/follow/${alice.id}`).set(auth(carol));
    expect((await request(app).put(`/api/social/block/${carol.id}`).set(auth(alice))).body).toEqual({ blocked: true });
    const { rows: f } = await pool.query('SELECT 1 FROM follows WHERE follower_id=$1 AND followed_id=$2', [carol.id, alice.id]);
    expect(f).toHaveLength(0);
    expect(ids(await listAuthor(carol, alice.id))).not.toContain(p.id);
    expect((await request(app).get(`/api/posts/${p.id}`).set(auth(carol))).status).toBe(404);
    expect((await request(app).post(`/api/posts/${p.id}/comments`).set(auth(carol)).send({ content: 'hi' })).status).toBe(404);
    expect((await request(app).post(`/api/profiles/follow/${alice.id}`).set(auth(carol))).status).toBe(403);
    expect((await request(app).post('/api/messages/conversations/find-or-create').set(auth(carol)).send({ target_user_id: alice.id })).status).toBe(403);
    const carolPost = await post(carol, 'Alice won’t see me either');
    expect(ids(await listAuthor(alice, carol.id))).not.toContain(carolPost.id);
    await request(app).delete(`/api/social/block/${carol.id}`).set(auth(alice));
    expect((await request(app).get(`/api/posts/${p.id}`).set(auth(carol))).status).toBe(200);
  });
});

describe('comments', () => {
  it('who can comment: followers only, then off', async () => {
    const p = await post(alice, 'Followers only');
    await request(app).put(`/api/posts/${p.id}/settings`).set(auth(alice)).send({ comment_policy: 'followers' });
    const refused = await request(app).post(`/api/posts/${p.id}/comments`).set(auth(bob)).send({ content: 'me?' });
    expect(refused.status).toBe(403);
    expect(refused.body.message).toMatch(/follow/);
    await request(app).post(`/api/profiles/follow/${alice.id}`).set(auth(bob));
    expect((await request(app).post(`/api/posts/${p.id}/comments`).set(auth(bob)).send({ content: 'now me' })).status).toBe(201);
    await request(app).put(`/api/posts/${p.id}/settings`).set(auth(alice)).send({ comment_policy: 'off' });
    expect((await request(app).post(`/api/posts/${p.id}/comments`).set(auth(bob)).send({ content: 'again' })).status).toBe(403);
    expect((await request(app).post(`/api/posts/${p.id}/comments`).set(auth(alice)).send({ content: 'owner can' })).status).toBe(201);
  });

  it('restricted people’s comments are seen only by them and the post owner', async () => {
    const p = await post(alice, 'Restrict test');
    await request(app).put(`/api/social/restrict/${carol.id}`).set(auth(alice));
    const c = (await request(app).post(`/api/posts/${p.id}/comments`).set(auth(carol)).send({ content: 'restricted words' })).body;
    const seen = async (viewer) => (await request(app).get(`/api/posts/${p.id}/comments`).set(auth(viewer))).body.map((x) => x.id);
    expect(await seen(carol)).toContain(c.id);
    expect(await seen(alice)).toContain(c.id);
    expect(await seen(bob)).not.toContain(c.id);
    await request(app).delete(`/api/social/restrict/${carol.id}`).set(auth(alice));
  });

  it('edit your own comment (shows edited), react to comments, owner deletes any comment', async () => {
    const p = await post(alice, 'Comment tools');
    const c = (await request(app).post(`/api/posts/${p.id}/comments`).set(auth(bob)).send({ content: 'first' })).body;
    expect((await request(app).put(`/api/posts/${p.id}/comments/${c.id}`).set(auth(carol)).send({ content: 'hijack' })).status).toBe(403);
    const edited = await request(app).put(`/api/posts/${p.id}/comments/${c.id}`).set(auth(bob)).send({ content: 'fixed typo' });
    expect(edited.body).toMatchObject({ content: 'fixed typo' });
    expect(edited.body.edited_at).toBeTruthy();
    expect((await request(app).put(`/api/posts/${p.id}/comments/${c.id}/reaction`).set(auth(carol)).send({ reaction: '👏' })).body).toEqual({ my_reaction: '👏', reaction_count: 1 });
    const list = (await request(app).get(`/api/posts/${p.id}/comments`).set(auth(carol))).body;
    expect(list.find((x) => x.id === c.id)).toMatchObject({ my_reaction: '👏', reaction_count: 1, top_reactions: ['👏'] });
    expect((await request(app).delete(`/api/posts/${p.id}/comments/${c.id}`).set(auth(alice))).status).toBe(200);
  });
});

describe('owner settings and privacy', () => {
  it('pins up to 3 posts, shown first on the profile', async () => {
    const older = await post(alice, 'Pin me');
    await post(alice, 'Newer post');
    await request(app).put(`/api/posts/${older.id}/settings`).set(auth(alice)).send({ pinned: true });
    const list = await listAuthor(bob, alice.id);
    expect(list.body.posts[0]).toMatchObject({ id: older.id, is_pinned: true });
    expect(ids(list).filter((id) => id === older.id)).toHaveLength(1);
    for (let i = 0; i < 2; i++) {
      const x = await post(alice, `pin ${i}`);
      await request(app).put(`/api/posts/${x.id}/settings`).set(auth(alice)).send({ pinned: true });
    }
    const fourth = await post(alice, 'one too many');
    const res = await request(app).put(`/api/posts/${fourth.id}/settings`).set(auth(alice)).send({ pinned: true });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('pin_limit');
  });

  it('who sees my posts: followers or only me', async () => {
    const p = await post(carol, 'Private-ish');
    expect((await request(app).put('/api/social/privacy').set(auth(carol)).send({ profile_visibility: 'followers' })).body.profile_visibility).toBe('followers');
    expect(ids(await listAuthor(bob, carol.id))).not.toContain(p.id);
    await request(app).post(`/api/profiles/follow/${carol.id}`).set(auth(bob));
    expect(ids(await listAuthor(bob, carol.id))).toContain(p.id);
    await request(app).put('/api/social/privacy').set(auth(carol)).send({ profile_visibility: 'private' });
    expect(ids(await listAuthor(bob, carol.id))).not.toContain(p.id);
    expect(ids(await listAuthor(carol, carol.id))).toContain(p.id);
    await request(app).put('/api/social/privacy').set(auth(carol)).send({ profile_visibility: 'public' });
    expect((await request(app).put('/api/social/privacy').set(auth(carol)).send({ profile_visibility: 'everyone' })).status).toBe(422);
  });

  it('new posts start with my default "who can comment"', async () => {
    await request(app).put('/api/social/privacy').set(auth(alice)).send({ default_comment_policy: 'followers' });
    const p = await post(alice, 'Default policy');
    const { rows: [row] } = await pool.query('SELECT comment_policy FROM posts WHERE id=$1', [p.id]);
    expect(row.comment_policy).toBe('followers');
    await request(app).put('/api/social/privacy').set(auth(alice)).send({ default_comment_policy: 'everyone' });
  });

  it('lists the people I blocked, muted or restricted', async () => {
    await request(app).put(`/api/social/mute/${carol.id}`).set(auth(bob));
    const res = await request(app).get('/api/social/people?kind=muted').set(auth(bob));
    expect(res.body.map((x) => x.user_id)).toContain(carol.id);
    expect((await request(app).get('/api/social/people?kind=everyone').set(auth(bob))).status).toBe(422);
    await request(app).delete(`/api/social/mute/${carol.id}`).set(auth(bob));
  });

  it('who can message me: nobody', async () => {
    await request(app).put('/api/social/privacy').set(auth(carol)).send({ message_policy: 'nobody' });
    const res = await request(app).post('/api/messages/conversations/find-or-create').set(auth(bob)).send({ target_user_id: carol.id });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/isn’t taking new messages/);
    expect((await request(app).get('/api/social/privacy').set(auth(carol))).body).toMatchObject({ message_policy: 'nobody', searchable: true });
    await request(app).put('/api/social/privacy').set(auth(carol)).send({ message_policy: 'everyone' });
  });
});
