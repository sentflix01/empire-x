'use strict';

/**
 * Two routes that passed review with a mocked pool but failed on Postgres:
 * - editing a payment account built "account_name=3" instead of "$3" (audit FUNC-06);
 * - notifications selected columns no migration creates (audit FUNC-01).
 * Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses', require('../../routes/businesses'));
  app.use('/api/notifications', require('../../routes/notifications'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
let app; let owner; let other; let biz; let account;

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  other = await createUser();
  biz = await createPublicBusiness(owner.id);
  const { rows: [row] } = await pool.query(
    `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number)
     VALUES ($1, 'mobile_money', 'telebirr', 'Old Name', '0911000777') RETURNING id`,
    [biz.businessId],
  );
  account = row.id;
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, 'like', 'New like', 'Someone liked your post', '/feed')`,
    [owner.id],
  );
});

afterAll(async () => {
  await deleteUser(owner.id);
  await deleteUser(other.id);
});

describe('payment account edits (FUNC-06)', () => {
  it('saves a changed field', async () => {
    const res = await request(app).put(`/api/businesses/${biz.businessId}/payment-accounts/${account}`)
      .set(auth(owner)).send({ account_name: 'Abebe Coffee PLC' });
    expect(res.status).toBe(200);
    expect(res.body.account_name).toBe('Abebe Coffee PLC');
  });

  it('switches a payment method off, as the owner toggle does', async () => {
    const res = await request(app).put(`/api/businesses/${biz.businessId}/payment-accounts/${account}`)
      .set(auth(owner)).send({ is_active: false });
    expect(res.status).toBe(200);
    const { rows: [row] } = await pool.query('SELECT is_active FROM business_payment_accounts WHERE id=$1', [account]);
    expect(row.is_active).toBe(false);
  });

  it('still refuses another user', async () => {
    const res = await request(app).put(`/api/businesses/${biz.businessId}/payment-accounts/${account}`)
      .set(auth(other)).send({ account_name: 'Hijacked' });
    expect([403, 404]).toContain(res.status);
    const { rows: [row] } = await pool.query('SELECT account_name FROM business_payment_accounts WHERE id=$1', [account]);
    expect(row.account_name).toBe('Abebe Coffee PLC');
  });
});

describe('notifications list (FUNC-01)', () => {
  it('loads, with no sender shown until notifications record one', async () => {
    const res = await request(app).get('/api/notifications').set(auth(owner));
    expect(res.status).toBe(200);
    const list = Array.isArray(res.body) ? res.body : res.body.notifications;
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toMatchObject({ title: 'New like', actor_name: null, actor_avatar: null });
  });
});
