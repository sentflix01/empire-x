/**
 * Decision "Reviews are platform-owned and mandatory on every website"
 * (14 Nov 2026): owners cannot add customer quotes or ratings themselves.
 * Real reviews from verified customers are added by the platform to every
 * published site (components/business/BusinessReviews.tsx). These checks keep
 * the builder, its templates and its samples from bringing them back.
 */
import { describe, it, expect } from 'vitest';
import { SECTION_TYPES, CATEGORY_DEFAULT_SECTIONS, RETIRED_SECTION_TYPES } from '@/lib/builderSections';
import { SHOWROOM_TEMPLATES } from '@/lib/showroomTemplates';
import { BUSINESS_CATEGORIES } from '@/lib/businessTemplates';
import { LAYOUT_TEMPLATES } from '@/lib/layoutTemplates';
import { getShowroomTemplateSamples } from '@/lib/showroomTemplateSamples';

// "4.8 rating", "5 stars", "★ 4.9", "1,200 reviews": a number next to a rating word.
const RATING_CLAIM = /(\d[\d.,]*\s*(★|stars?\b|rating\b|reviews?\b))|(★\s*\d)/i;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}
function types(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => types(v, out));
  else if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.type === 'string') out.push(rec.type);
    Object.values(rec).forEach((v) => types(v, out));
  }
  return out;
}

describe('customer reviews are platform-owned', () => {
  it('owners cannot add a testimonials section', () => {
    expect(RETIRED_SECTION_TYPES.has('testimonials')).toBe(true);
    expect(SECTION_TYPES.map((s) => s.key)).not.toContain('testimonials');
    for (const [category, keys] of Object.entries(CATEGORY_DEFAULT_SECTIONS)) {
      expect(keys, category).not.toContain('testimonials');
    }
  });

  it('no template or sample includes an owner-written testimonials section', () => {
    const all = [SHOWROOM_TEMPLATES, BUSINESS_CATEGORIES, LAYOUT_TEMPLATES];
    for (const set of all) expect(types(set)).not.toContain('testimonials');
    for (const category of Object.keys(CATEGORY_DEFAULT_SECTIONS)) {
      for (const sample of getShowroomTemplateSamples('Any', category)) {
        expect(sample.activeSections, `${category}/${sample.id}`).not.toContain('testimonials');
      }
    }
  });

  it('no template or sample text invents a rating or a review count', () => {
    const samples = Object.keys(CATEGORY_DEFAULT_SECTIONS).flatMap((c) => getShowroomTemplateSamples('Any', c));
    const offending = strings([SHOWROOM_TEMPLATES, BUSINESS_CATEGORIES, LAYOUT_TEMPLATES, samples])
      .filter((s) => RATING_CLAIM.test(s));
    expect(offending).toEqual([]);
  });
});
