import { describe, it, expect } from 'vitest';
import { computePreview, resolveDotPath, unwrapSample } from '../lib/externalMappingPreview';

describe('resolveDotPath (client twin of backend mapping engine)', () => {
  it('resolves simple and nested paths', () => {
    const obj = { a: { b: { c: 42 } }, name: 'Hat' };
    expect(resolveDotPath(obj, 'name')).toBe('Hat');
    expect(resolveDotPath(obj, 'a.b.c')).toBe(42);
  });
  it('returns undefined for missing hops and non-string paths', () => {
    expect(resolveDotPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(resolveDotPath(null, 'a')).toBeUndefined();
    expect(resolveDotPath({ a: 1 }, 123 as unknown as string)).toBeUndefined();
  });
});

describe('unwrapSample (mirrors backend envelope heuristic)', () => {
  it('passes arrays through and unwraps single-key array envelopes', () => {
    expect(unwrapSample([{ x: 1 }])).toEqual({ x: 1 });
    expect(unwrapSample({ items: [{ title: 'Hat' }] })).toEqual({ title: 'Hat' });
    expect(unwrapSample({ a: 1, b: [2] })).toEqual({ a: 1, b: [2] }); // two keys → no unwrap
  });
});

describe('computePreview — live mapped-result preview', () => {
  const rows = [
    { targetField: 'title', label: 'Title', sourcePath: 'title' },
    { targetField: 'price', label: 'Price', sourcePath: 'pricing.amount' },
    { targetField: 'empty', label: 'Unset', sourcePath: '' },
  ];

  it('maps dot paths against the pasted sample and reports detected keys', () => {
    const res = computePreview(
      JSON.stringify({ items: [{ title: 'Fedora', pricing: { amount: 199 } }] }),
      rows,
    );
    expect(res.parseError).toBeNull();
    expect(res.detectedKeys).toEqual(['title', 'pricing']);
    expect(res.values.title).toBe('Fedora');
    expect(res.values.price).toBe('199');
    expect(res.mappedSample).toEqual({ title: 'Fedora', price: 199 });
  });

  it('reports invalid JSON without throwing', () => {
    const res = computePreview('{oops', rows);
    expect(res.parseError).toMatch(/Invalid JSON/);
    expect(res.mappedSample).toBeNull();
  });

  it('empty input produces an empty, error-free result', () => {
    const res = computePreview('   ', rows);
    expect(res).toEqual({ values: {}, detectedKeys: [], parseError: null, mappedSample: null });
  });

  it('missing paths resolve to empty display strings but are omitted from the mapped sample', () => {
    const res = computePreview('[{"title":"Cap"}]', rows);
    expect(res.values.price).toBe('');
    expect(res.mappedSample).toEqual({ title: 'Cap' });
  });
});
