'use strict';

/**
 * Rooms with an availability calendar (decision "Room bookings: availability
 * calendar and 48-hour hold"): free rooms per night, owner-closed nights, no
 * double-booking under parallel requests, released nights, price × nights.
 * Real Postgres. The guest booking limiter allows 10 per file: keep under it.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');
const { today, addDays } = require('../../lib/roomAvailability');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses/:businessId/rooms', require('../../routes/businessRooms'));
  app.use('/api/rooms', require('../../routes/rooms'));
  app.use('/api/direct-orders', require('../../routes/directOrders'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const guest = { buyer_name: 'Guest Traveller', buyer_phone: '+251911000222', buyer_email: 'guest-room@example.test' };
const day = (n) => addDays(today(), n);

let app; let owner; let other; let bizId; let room;

const book = (body, headers = {}) => request(app).post('/api/direct-orders/bookings').set(headers).send({ ...guest, room_type_id: room.id, guests: 2, rooms: 1, ...body });
const availability = (from, to, headers = {}) => request(app).get(`/api/rooms/${room.id}/availability`).query({ from, to }).set(headers);
const freeOn = async (night, headers) => (await availability(night, addDays(night, 1), headers)).body.nights[0].free;

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  other = await createUser();
  ({ businessId: bizId } = await createPublicBusiness(owner.id));
  await pool.query(
    `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number) VALUES ($1, 'bank', 'CBE', 'Test Hotel', '1000123456789')`,
    [bizId],
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [owner.id]);
  await deleteUser(owner.id);
  await deleteUser(other.id);
});

describe('room types', () => {
  it('the owner adds a room type; others cannot', async () => {
    const body = { name: 'Deluxe double', price_per_night: 1500, max_guests: 2, units: 2, description: 'Lake view' };
    expect((await request(app).post(`/api/businesses/${bizId}/rooms`).set(auth(other)).send(body)).status).toBe(403);
    expect((await request(app).post(`/api/businesses/${bizId}/rooms`).set(auth(owner)).send({ ...body, units: 0 })).status).toBe(422);
    const res = await request(app).post(`/api/businesses/${bizId}/rooms`).set(auth(owner)).send(body);
    expect(res.status).toBe(201);
    room = res.body.room;
    expect(room).toMatchObject({ name: 'Deluxe double', price_per_night: 1500, units: 2, active: true });
  });

  it('guests see active rooms; a malformed business id is a 404', async () => {
    const list = await request(app).get(`/api/businesses/${bizId}/rooms`);
    expect(list.status).toBe(200);
    expect(list.body.rooms.map((r) => r.id)).toContain(room.id);
    expect((await request(app).get('/api/businesses/not-a-uuid/rooms')).status).toBe(404);
  });
});

describe('booking', () => {
  it('rejects bad dates and too many guests', async () => {
    expect((await book({ check_in: day(-1), check_out: day(1) })).status).toBe(422);
    expect((await book({ check_in: day(1), check_out: day(40) })).status).toBe(422);
    expect((await book({ check_in: day(1), check_out: day(2), guests: 5 })).status).toBe(422);
  });

  it('books 2 nights for price × nights × rooms and holds them for 48 hours', async () => {
    const res = await book({ check_in: day(10), check_out: day(12) });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ status: 'requested', check_in: day(10), check_out: day(12), nights: 2, rooms: 1, guests: 2 });
    expect(Number(res.body.order.total_price)).toBe(3000);
    expect(res.body.access_token).toBeTruthy();
    const hold = new Date(res.body.order.payment_expires_at).getTime() - Date.now();
    expect(hold).toBeGreaterThan(47 * 3600_000);
    expect(hold).toBeLessThan(49 * 3600_000);
  });

  it('shows visitors free rooms only, and the owner the counts', async () => {
    const guestView = await availability(day(9), day(13));
    expect(guestView.body.nights.map((n) => n.free)).toEqual([2, 1, 1, 2]);
    expect(guestView.body.nights[0]).not.toHaveProperty('booked');
    const ownerView = await availability(day(10), day(11), auth(owner));
    expect(ownerView.body.nights[0]).toMatchObject({ booked: 1, blocked: 0, free: 1 });
  });

  it('lets the owner close and reopen a night', async () => {
    expect((await request(app).put(`/api/rooms/${room.id}/blocks/${day(20)}`).set(auth(other)).send({ units: 1 })).status).toBe(403);
    const close = await request(app).put(`/api/rooms/${room.id}/blocks/${day(20)}`).set(auth(owner)).send({ units: 2, note: 'Painting' });
    expect(close.body).toMatchObject({ blocked: 2, free: 0 });
    const refused = await book({ check_in: day(19), check_out: day(21) });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ code: 'ROOMS_UNAVAILABLE', nights: [day(20)] });
    await request(app).put(`/api/rooms/${room.id}/blocks/${day(20)}`).set(auth(owner)).send({ units: 0 });
    expect(await freeOn(day(20))).toBe(2);
  });

  it('gives the last room to exactly one of two parallel requests', async () => {
    // Night day(11) has 1 room left.
    const [a, b] = await Promise.all([
      book({ check_in: day(11), check_out: day(12), guests: 1 }),
      book({ check_in: day(11), check_out: day(12), guests: 1, buyer_email: 'second-guest@example.test' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await freeOn(day(11))).toBe(0);
  });

  it('releases the nights when the hotel declines or the hold expires', async () => {
    const { rows } = await pool.query("SELECT id FROM orders WHERE room_type_id = $1 AND check_in = $2 ORDER BY created_at", [room.id, day(11)]);
    const decline = await request(app).post(`/api/direct-orders/${rows[0].id}/decline-request`).set(auth(owner));
    expect(decline.status).toBe(200);
    expect(await freeOn(day(11))).toBe(1);
    // An unpaid hold past its expiry frees the rooms even before the expiry job runs.
    await pool.query("UPDATE orders SET payment_expires_at = NOW() - interval '1 minute' WHERE room_type_id = $1 AND check_in = $2", [room.id, day(10)]);
    expect(await freeOn(day(11))).toBe(2);
  });

  it('the hotel confirms at a per-night price, multiplied by nights and rooms', async () => {
    const res = await book({ check_in: day(30), check_out: day(33), rooms: 2, guests: 3 });
    expect(Number(res.body.order.total_price)).toBe(9000);
    const priced = await request(app).post(`/api/direct-orders/${res.body.order.id}/set-price`).set(auth(owner)).send({ unit_price: 1000 });
    expect(priced.status).toBe(200);
    expect(priced.body.order).toMatchObject({ status: 'awaiting_payment' });
    expect(Number(priced.body.order.total_price)).toBe(6000);
  });

  it('shows the owner a bookings calendar', async () => {
    expect((await request(app).get(`/api/businesses/${bizId}/rooms/bookings`).set(auth(other))).status).toBe(403);
    const cal = await request(app).get(`/api/businesses/${bizId}/rooms/bookings`).query({ from: day(0), to: day(60) }).set(auth(owner));
    expect(cal.status).toBe(200);
    expect(cal.body.bookings.map((b) => b.check_in)).toEqual([day(30)]);
  });

  it('hides a room type that has bookings instead of deleting it', async () => {
    const del = await request(app).delete(`/api/businesses/${bizId}/rooms/${room.id}`).set(auth(owner));
    expect(del.body).toMatchObject({ deleted: false, hidden: true });
    expect((await availability(day(1), day(2))).status).toBe(404);
    expect((await availability(day(1), day(2), auth(owner))).status).toBe(200);
  });
});
