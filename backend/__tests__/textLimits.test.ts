/**
 * Text longer than its limit is refused with 422 before any route runs
 * (audit F-058: one member saved 900,000-character product titles, and every
 * visitor's marketplace list became 2.2 MB).
 */
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../db/pool';
import defaultBody from '../middleware/defaultBody';
import textLimits from '../middleware/textLimits';
import { DEFAULT_MAX, TEXT_LIMITS, findTextLimitViolation, fieldLabel } from '../lib/textLimits';

const query = (pool as unknown as { query: jest.Mock }).query;

describe('findTextLimitViolation', () => {
  it('accepts text at the limit and refuses one character more', () => {
    expect(findTextLimitViolation({ title: 'x'.repeat(200) })).toBeNull();
    expect(findTextLimitViolation({ title: 'x'.repeat(201) })).toEqual({ field: 'title', max: 200, length: 201 });
  });

  it('uses the owner-approved limits', () => {
    expect(TEXT_LIMITS.title).toBe(200);
    expect(TEXT_LIMITS.description).toBe(5_000);
    expect(TEXT_LIMITS.content).toBe(5_000);
    expect(TEXT_LIMITS.business_name).toBe(100);
  });

  it('caps fields without their own limit at the default', () => {
    expect(findTextLimitViolation({ some_new_field: 'x'.repeat(DEFAULT_MAX) })).toBeNull();
    expect(findTextLimitViolation({ some_new_field: 'x'.repeat(DEFAULT_MAX + 1) })?.max).toBe(DEFAULT_MAX);
  });

  it('allows long JSON text in website sections', () => {
    expect(findTextLimitViolation({ sections: 'x'.repeat(150_000) })).toBeNull();
    expect(findTextLimitViolation({ sections: 'x'.repeat(200_001) })?.field).toBe('sections');
  });

  it('checks nested objects and arrays (bulk product rows, tag lists)', () => {
    expect(findTextLimitViolation({ products: [{ title: 'ok' }, { title: 'x'.repeat(201) }] })?.field).toBe('title');
    expect(findTextLimitViolation({ tags: ['ok', 'x'.repeat(DEFAULT_MAX + 1)] })?.field).toBe('tags');
  });

  it('counts Amharic and emoji like any other text', () => {
    expect(findTextLimitViolation({ title: 'ቡና ☕ '.repeat(30) })).toBeNull();
  });

  it('ignores numbers, booleans and null', () => {
    expect(findTextLimitViolation({ price: 1e20, active: true, note: null })).toBeNull();
  });

  it('names the field for people', () => {
    expect(fieldLabel('business_name')).toBe('Business name');
  });
});

describe('textLimits middleware on real routers', () => {
  function buildApp() {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use(defaultBody);
    app.use(textLimits);
    /* eslint-disable @typescript-eslint/no-require-imports */
    app.use('/api/products', require('../routes/products'));
    app.use('/api/posts', require('../routes/posts'));
    app.use('/api/businesses', require('../routes/businesses'));
    /* eslint-enable @typescript-eslint/no-require-imports */
    return app;
  }

  beforeEach(() => query.mockReset());

  it.each([
    ['/api/products', { title: 'x'.repeat(201), price: 1, stock: 1 }, 'title'],
    ['/api/products', { title: 'Coffee', description: 'y'.repeat(5_001), price: 1, stock: 1 }, 'description'],
    ['/api/posts', { content: 'z'.repeat(5_001) }, 'content'],
    ['/api/businesses', { business_name: 'b'.repeat(101), business_category: 'retail' }, 'business_name'],
  ])('POST %s refuses over-long %#', async (path, body, field) => {
    const res = await request(buildApp()).post(path).send(body);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'TEXT_TOO_LONG', field });
    expect(res.body.error).toMatch(/too long/);
    // Refused before any database work.
    expect(query).not.toHaveBeenCalled();
  });

  it('refuses a body over 2 MB with 413', async () => {
    const res = await request(buildApp()).post('/api/posts').set('Content-Type', 'application/json')
      .send(JSON.stringify({ a: 'x'.repeat(9_000), filler: Array.from({ length: 300 }, () => 'y'.repeat(9_000)) }));
    expect(res.status).toBe(413);
  });
});

describe('frontend limits', () => {
  it('match the server for every field the forms cap', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'frontend-next', 'lib', 'textLimits.ts'), 'utf8');
    for (const [, field, value] of src.matchAll(/^\s+([a-z_]+): ([\d_]+),$/gm)) {
      expect([field, Number(value.replace(/_/g, ''))]).toEqual([field, TEXT_LIMITS[field]]);
    }
    expect(src).toMatch(/business_name: 100/);
  });
});

describe('index.ts', () => {
  it('runs the text check after the body parsers, with a 2 MB body limit', () => {
    const src = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8');
    expect(src).toMatch(/express\.json\(\{ limit: '2mb' \}\)/);
    expect(src.indexOf('app.use(textLimits)')).toBeGreaterThan(src.indexOf('app.use(defaultBody)'));
    expect(src.indexOf('app.use(textLimits)')).toBeLessThan(src.indexOf("app.use('/api/products'"));
  });
});
