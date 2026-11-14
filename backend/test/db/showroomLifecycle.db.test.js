'use strict';

/**
 * The whole website (showroom) lifecycle against real Postgres
 * (audit 2026-11-14, docs/audits/2026-11-showroom-builder-audit.md):
 * create, validate, publish, edit, keep the address, unpublish, publish
 * again, count visits, refuse strangers, delete. Also the retirement of
 * owner-written testimonials (decision "Reviews are platform-owned and
 * mandatory on every website").
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api/showrooms', require('../../routes/showrooms'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const sections = (...types) => JSON.stringify(types.map((type) => ({ type, title: `${type} title` })));

let app; let owner; let stranger; let noBiz; let bizId;

beforeAll(async () => {
  app = buildApp();
  [owner, stranger, noBiz] = await Promise.all([createUser(), createUser(), createUser()]);
  ({ businessId: bizId } = await createPublicBusiness(owner.id));
  // createPublicBusiness also makes a site; this file creates its own.
  await pool.query('DELETE FROM showrooms WHERE owner_id = $1', [owner.id]);
});

afterAll(async () => {
  for (const u of [owner, stranger, noBiz]) await deleteUser(u.id);
});

const create = (user, body) => request(app).post('/api/showrooms').set(auth(user)).send(body);
const update = (user, id, body) => request(app).put(`/api/showrooms/${id}`).set(auth(user)).send(body);

describe('website lifecycle', () => {
  let siteId; let slug;

  it('creates a draft, ignoring server-owned columns (no mass assignment)', async () => {
    const res = await create(owner, {
      title: `Selam Café ${tag()}`, category: 'Food & Beverage', sections: sections('hero', 'menu', 'contact'),
      business_id: bizId, view_count: 99999, spotlight_mode: 'single', expires_at: null, owner_id: stranger.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.view_count).toBe(0);
    expect(res.body.owner_id).toBe(owner.id);
    expect(res.body.expires_at).not.toBeNull();
    expect(res.body.slug).toMatch(/^selam-cafe-/);
    siteId = res.body.id; slug = res.body.slug;
  });

  it('refuses unsafe links and oversize input with a 400 that names the field', async () => {
    const bad = await update(owner, siteId, { sections: JSON.stringify([{ type: 'social', facebook: 'javascript:alert(1)' }]) });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'invalid_showroom_sections', field: 'sections[0].facebook' });
    expect((await update(owner, siteId, { title: 'x'.repeat(121) })).body.field).toBe('title');
    expect((await update(owner, siteId, { theme_color: 'url(javascript:x)' })).status).toBe(400);
    expect((await update(owner, siteId, { status: 'live' })).status).toBe(400);
  });

  it('publishes, dropping an old owner-written testimonials section', async () => {
    const res = await update(owner, siteId, {
      status: 'published', theme_color: '#7C3AED', cover_image: 'https://cdn.example/cover.jpg',
      sections: JSON.stringify([{ type: 'hero' }, { type: 'testimonials', testimonials: [{ quote: 'Best!' }] }, { type: 'menu' }, { type: 'contact' }]),
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.expires_at).toBeNull();
    expect(res.body.theme_color).toBe('#7C3AED');
    expect(JSON.parse(res.body.sections).map((s) => s.type)).toEqual(['hero', 'menu', 'contact']);
  });

  it('keeps the address when the site is edited, and refuses a taken one with 409', async () => {
    const edited = await update(owner, siteId, { title: 'A completely new name', slug });
    expect(edited.status).toBe(200);
    expect(edited.body.slug).toBe(slug);
    const other = await create(owner, { title: `Other ${tag()}`, category: 'Food & Beverage', business_id: bizId });
    const clash = await update(owner, other.body.id, { slug });
    expect(clash.status).toBe(409);
    expect(clash.body.error).toBe('slug_taken');
    await request(app).delete(`/api/showrooms/${other.body.id}`).set(auth(owner));
  });

  it('counts visitors but not the owner', async () => {
    const before = (await pool.query('SELECT view_count FROM showrooms WHERE id=$1', [siteId])).rows[0].view_count;
    expect((await request(app).get(`/api/showrooms/slug/${slug}`).set(auth(owner))).status).toBe(200);
    expect((await request(app).get(`/api/showrooms/slug/${slug}`).set(auth(stranger))).status).toBe(200);
    const after = (await pool.query('SELECT view_count FROM showrooms WHERE id=$1', [siteId])).rows[0].view_count;
    expect(after).toBe(before + 1);
  });

  it('refuses strangers on edit, status change and delete', async () => {
    expect((await update(stranger, siteId, { title: 'Hijacked' })).status).toBe(403);
    expect((await update(stranger, siteId, { status: 'archived' })).status).toBe(403);
    expect((await request(app).delete(`/api/showrooms/${siteId}`).set(auth(stranger))).status).toBe(403);
    expect((await request(app).put(`/api/showrooms/${siteId}`).send({ title: 'No auth' })).status).toBe(401);
  });

  it('unpublishes (kept, hidden from visitors) and publishes again', async () => {
    const off = await update(owner, siteId, { status: 'archived' });
    expect(off.status).toBe(200);
    expect(off.body.status).toBe('archived');
    expect(off.body.expires_at).toBeNull();
    expect((await request(app).get(`/api/showrooms/slug/${slug}`)).status).toBe(404);
    expect((await request(app).get(`/api/showrooms/${siteId}`).set(auth(stranger))).status).toBe(404);
    expect((await request(app).get(`/api/showrooms/${siteId}`).set(auth(owner))).status).toBe(200);
    const on = await update(owner, siteId, { status: 'published' });
    expect(on.status).toBe(200);
    expect((await request(app).get(`/api/showrooms/slug/${slug}`)).status).toBe(200);
  });

  it('deletes the site for good', async () => {
    expect((await request(app).delete(`/api/showrooms/${siteId}`).set(auth(owner))).status).toBe(200);
    expect((await request(app).get(`/api/showrooms/slug/${slug}`)).status).toBe(404);
  });
});

describe('publishing rules', () => {
  it('a non-Latin title still gets a valid address', async () => {
    const res = await create(owner, { title: 'ሰላም ካፌ', category: 'Food & Beverage', business_id: bizId });
    expect(res.status).toBe(201);
    expect(res.body.slug).toMatch(/^site(-[a-z0-9]+)?$/);
    await request(app).delete(`/api/showrooms/${res.body.id}`).set(auth(owner));
  });

  it('a website cannot go live without a Business profile (its reviews need one)', async () => {
    const res = await create(noBiz, { title: `No business ${tag()}`, category: 'Food & Beverage', sections: sections('hero'), status: 'published' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('business_profile_required');
    const saved = await pool.query('SELECT status FROM showrooms WHERE id=$1', [res.body.draftId]);
    expect(saved.rows[0].status).toBe('draft');
    await pool.query('DELETE FROM showrooms WHERE id=$1', [res.body.draftId]);
  });

  it('an old site whose only section was testimonials cannot publish empty', async () => {
    const res = await create(owner, { title: `Empty ${tag()}`, category: 'Food & Beverage', business_id: bizId, sections: JSON.stringify([{ type: 'testimonials' }]), status: 'published' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_showroom_sections');
  });
});
