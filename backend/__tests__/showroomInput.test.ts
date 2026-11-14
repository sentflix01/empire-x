/**
 * Website create/update input checks (audit 2026-11-14,
 * docs/audits/2026-11-showroom-builder-audit.md) and the retirement of
 * owner-written testimonials (decision "Reviews are platform-owned and
 * mandatory on every website").
 */
import { checkSpotlight, checkShowroomInput, cleanSections, slugBase, SHOWROOM_LIMITS } from '../lib/showroomInput';
const { normalizeSections, getRequiredBusinessTier } = require('../lib/builderSectionRequirements');
const { clean } = require('../db/migrate91');

const ok = (body: unknown) => {
  const r = checkShowroomInput(body);
  if (!r.ok) throw new Error(`${r.error}: ${r.message}`);
  return r.fields;
};
const err = (body: unknown) => {
  const r = checkShowroomInput(body);
  if (r.ok) throw new Error('expected a 400');
  return r;
};

describe('checkShowroomInput', () => {
  it('keeps only owner-writable columns (no mass assignment)', () => {
    const fields = ok({ title: ' Selam Café ', category: 'food', view_count: 9999, owner_id: 'x', id: 'y', spotlight_mode: 'single', expires_at: null, is_seed: true, created_at: 'now' });
    expect(fields).toEqual({ title: 'Selam Café', category: 'food', spotlight_mode: 'single' }); // spotlight_mode is owner-writable, validated by checkSpotlight
  });

  it('caps lengths and rejects an empty name', () => {
    expect(err({ title: 'x'.repeat(SHOWROOM_LIMITS.title + 1) }).field).toBe('title');
    expect(err({ description: 'x'.repeat(SHOWROOM_LIMITS.description + 1) }).field).toBe('description');
    expect(err({ title: '   ' }).field).toBe('title');
    expect(err({ title: 42 }).error).toBe('invalid_field');
  });

  it('checks status, colour, images and slug', () => {
    expect(err({ status: 'live' }).error).toBe('invalid_status');
    expect(err({ theme_color: 'red; background:url(x)' }).field).toBe('theme_color');
    expect(ok({ theme_color: '#2563EB' }).theme_color).toBe('#2563EB');
    expect(err({ cover_image: 'javascript:alert(1)' }).field).toBe('cover_image');
    expect(err({ cover_image: 'http://insecure.example/a.png' }).field).toBe('cover_image');
    expect(err({ logo_url: '//evil.example/x.png' }).field).toBe('logo_url');
    expect(ok({ cover_image: 'https://cdn.example/a.png', logo_url: '/uploads/l.png' })).toEqual({ cover_image: 'https://cdn.example/a.png', logo_url: '/uploads/l.png' });
    expect(err({ slug: 'Bad Slug!' }).error).toBe('invalid_slug');
    expect(err({ slug: 'ab' }).error).toBe('invalid_slug');
    expect(ok({ slug: 'selam-cafe-2' }).slug).toBe('selam-cafe-2');
  });

  it('refuses script and data URLs anywhere inside sections, naming the field', () => {
    const r = err({ sections: JSON.stringify([{ type: 'social', facebook: 'javascript:alert(document.cookie)' }]) });
    expect(r.error).toBe('invalid_showroom_sections');
    expect(r.field).toBe('sections[0].facebook');
    expect(err({ sections: [{ type: 'gallery', galleryImages: [{ url: ' data:text/html;base64,PHNjcmlwdD4=' }] }] }).field).toBe('sections[0].galleryImages[0].url');
    expect(err({ sections: [{ type: 'brands', brands: [{ logo: 'VBScript:msgbox' }] }] }).field).toBe('sections[0].brands[0].logo');
  });

  it('keeps ordinary text, even text that looks like HTML (React renders it as text)', () => {
    const fields = ok({ sections: [{ type: 'about', aboutDesc: '<b>Fresh</b> bread & coffee: open 7-17' }] });
    expect(JSON.parse(String(fields.sections))[0].aboutDesc).toContain('<b>Fresh</b>');
  });

  it('caps the number and size of sections', () => {
    expect(err({ sections: Array.from({ length: SHOWROOM_LIMITS.sections + 1 }, (_, i) => ({ type: `s${i}` })) }).error).toBe('invalid_showroom_sections');
    expect(err({ sections: [{ type: 'about', aboutDesc: 'x'.repeat(SHOWROOM_LIMITS.string + 1) }] }).field).toBe('sections[0].aboutDesc');
    expect(err({ sections: '{not json' }).error).toBe('invalid_showroom_sections');
    expect(err({ sections: { type: 'hero' } }).error).toBe('invalid_showroom_sections');
  });

  it('drops retired owner-written testimonials when saving', () => {
    const fields = ok({ sections: JSON.stringify([{ type: 'hero', title: 'Selam' }, { type: 'testimonials', testimonials: [{ quote: 'Best!', author: 'Me' }] }, { type: 'contact' }]) });
    expect(JSON.parse(String(fields.sections)).map((s: { type: string }) => s.type)).toEqual(['hero', 'contact']);
  });
});

describe('slugBase', () => {
  it('makes a readable address, also for non-Latin names', () => {
    expect(slugBase('Selam Café & Bakery')).toBe('selam-cafe-bakery');
    expect(slugBase('ሰላም ካፌ')).toBe('site');
    expect(slugBase('A')).toBe('site-a');
    expect(slugBase('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe('retired section types', () => {
  it('an old site that still contains testimonials can be published; the key is skipped', () => {
    const sections = [{ type: 'hero' }, { type: 'testimonials' }, { type: 'contact' }];
    expect(normalizeSections(sections).map((s: { type: string }) => s.type)).toEqual(['hero', 'contact']);
    expect(getRequiredBusinessTier(sections)).toBe('normal');
    expect(normalizeSections([{ type: 'testimonials' }])).toBeNull();
    expect(normalizeSections([{ type: 'not_a_section' }])).toBeNull();
    expect(cleanSections([{ type: 'testimonials' }])).toEqual({ ok: true, sections: '[]' });
  });
});

describe('migrate91 clean()', () => {
  it('removes testimonials sections and rating claims, keeps everything else', () => {
    const before = JSON.stringify([
      { type: 'hero', title: 'Selam' },
      { type: 'testimonials', testimonials: [{ quote: 'Great' }] },
      { type: 'testimonials', title: 'Reviews', items: [{ text: 'Legacy' }] },
      { type: 'stats', stats: [{ number: '500+', label: 'Customers served' }, { number: '4.8', label: 'Customer rating' }, { number: '120', label: 'Reviews' }] },
    ]);
    const result = clean(before);
    expect(result.changed).toBe(true);
    expect(JSON.parse(result.value)).toEqual([
      { type: 'hero', title: 'Selam' },
      { type: 'stats', stats: [{ number: '500+', label: 'Customers served' }] },
    ]);
    expect(clean(result.value).changed).toBe(false);
  });

  it('leaves invalid or non-array values alone', () => {
    expect(clean('{oops')).toEqual({ changed: false, invalid: true });
    expect(clean('{"type":"hero"}').changed).toBe(false);
    expect(clean(null).changed).toBe(false);
  });
});

describe('Feed Spotlight on create/update (shared with the spotlight route)', () => {
  it('accepts the choice, de-duplicated in order, retired types dropped, stored as JSON text', () => {
    const r = checkShowroomInput({ title: 'Selam', spotlight_mode: 'carousel', spotlight_section_ids: ['about', 'items', 'about', 'testimonials', 'stats'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields.spotlight_mode).toBe('carousel');
    expect(r.fields.spotlight_section_ids).toBe('["about","items","stats"]');
  });

  it('refuses unknown types, bad modes, non-arrays and more than 20 sections', () => {
    expect(checkShowroomInput({ spotlight_section_ids: ['nope'] }).ok).toBe(false);
    expect(checkShowroomInput({ spotlight_mode: 'all' }).ok).toBe(false);
    expect(checkShowroomInput({ spotlight_section_ids: 'about' }).ok).toBe(false);
    const many = ['about', 'items', 'menu', 'services', 'pricing', 'offer', 'events', 'gallery', 'portfolio', 'team', 'faq', 'features', 'stats', 'before_after', 'certifications', 'brands', 'caseStudies', 'partners', 'awards', 'industries', 'process'];
    const r = checkShowroomInput({ spotlight_section_ids: many });
    expect(r.ok).toBe(false);
  });

  it('treats a null mode as Automatic and leaves the fields out when not sent', () => {
    const r = checkShowroomInput({ spotlight_mode: null, spotlight_section_ids: [] });
    expect(r.ok && r.fields.spotlight_mode).toBeNull();
    const none = checkShowroomInput({ title: 'x site' });
    expect(none.ok && 'spotlight_mode' in none.fields).toBe(false);
  });
});

describe('checkSpotlight', () => {
  it('is the single validator', () => {
    expect(checkSpotlight('single', ['menu'])).toEqual({ ok: true, mode: 'single', ids: ['menu'] });
  });
});
