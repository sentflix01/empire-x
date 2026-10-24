/**
 * Spotlight rules (lib/spotlight.ts): automatic picks the best selling
 * section, off shows nothing, chosen sections play in priority order, and the
 * same rules apply to every account (demo cards used to show nothing).
 */
import { describe, it, expect } from 'vitest';
import { resolveSpotlight, sectionHasContent, spotlightChoices } from '@/lib/spotlight';
import { businessToFeedBusiness, showroomToFeedBusiness } from '@/lib/feedBusiness';

const hero = { type: 'hero', title: 'Welcome' };
const contact = { type: 'contact', location: 'Bole, Addis Ababa' };
const hours = { type: 'hours', items: [{ day: 'Mon', hours: '9-5' }] };
const about = { type: 'about', aboutDesc: 'Family bakery', aboutImage: 'https://img.example/about.jpg' };
const aboutNoPicture = { type: 'about', aboutDesc: 'Family bakery' };
const services = { type: 'services', services: [{ name: 'Haircut', price: '300 ETB' }] };
const menu = { type: 'menu', dishes: [{ name: 'Shiro', price: '250' }] };
const products = { type: 'products', title: 'Shop' };
const gallery = { type: 'gallery', galleryImages: [{ url: 'https://img.example/1.jpg' }] };
const types = (r: ReturnType<typeof resolveSpotlight>) => r.slides.map((s) => s.section.type);

describe('automatic spotlight', () => {
  it('picks the highest-priority selling section', () => {
    expect(types(resolveSpotlight([hero, about, services, menu, contact], null, null, 0))).toEqual(['menu']);
    expect(types(resolveSpotlight([hero, about, services, contact], null, null, 0))).toEqual(['services']);
  });

  it('prefers the product catalogue when the business has products', () => {
    expect(types(resolveSpotlight([menu, products], null, null, 3))).toEqual(['products']);
    expect(types(resolveSpotlight([menu, products], null, null, 0))).toEqual(['menu']);
  });

  it('never spotlights the hero, contact, location or hours', () => {
    expect(resolveSpotlight([hero, contact, hours], null, null, 5).slides).toEqual([]);
  });

  it('shows About only with a picture', () => {
    expect(types(resolveSpotlight([aboutNoPicture], null, null, 0))).toEqual([]);
    expect(types(resolveSpotlight([about], null, null, 0))).toEqual(['about']);
  });

  it('keeps the section index so the renderer anchors match the site', () => {
    const r = resolveSpotlight([hero, contact, gallery], null, null, 0);
    expect(r.slides[0].index).toBe(2);
  });
});

describe('owner choices', () => {
  it('shows nothing when off', () => {
    expect(resolveSpotlight([menu, services], 'off', '["menu"]', 0).slides).toEqual([]);
  });

  it('plays several chosen sections in priority order, not the order chosen', () => {
    const r = resolveSpotlight([about, services, menu], 'carousel', ['about', 'menu', 'services'], 0);
    expect(types(r)).toEqual(['menu', 'services', 'about']);
    expect(r.carousel).toBe(true);
  });

  it('shows a single chosen section on its own', () => {
    const r = resolveSpotlight([menu, services, gallery], 'single', '["gallery"]', 0);
    expect(types(r)).toEqual(['gallery']);
    expect(r.carousel).toBe(false);
  });

  it('falls back to automatic when the choices are empty or not selling sections', () => {
    // Old demo seed data chose "contact" and "testimonials" (migrate76).
    expect(types(resolveSpotlight([contact, services], 'single', ['contact'], 0))).toEqual(['services']);
    expect(types(resolveSpotlight([menu], 'carousel', ['gallery'], 0))).toEqual(['menu']);
  });

  it('offers only selling sections the site has, in priority order', () => {
    expect(spotlightChoices([hero, about, gallery, services, contact])).toEqual(['services', 'gallery', 'about']);
  });
});

describe('section content', () => {
  it('ignores ended offers and empty lists', () => {
    const now = new Date('2026-10-24T12:00:00Z');
    expect(sectionHasContent({ type: 'offer', offerTitle: '10% off', offerEnds: '2026-10-01' }, 0, now)).toBe(false);
    expect(sectionHasContent({ type: 'offer', offerTitle: '10% off', offerEnds: '2026-11-01' }, 0, now)).toBe(true);
    expect(sectionHasContent({ type: 'services', services: [] }, 0)).toBe(false);
  });
});

describe('card data', () => {
  const showroom = {
    id: 'site-1', owner_id: 'owner-1', business_id: 'biz-1', title: 'Mewacho', slug: 'mewacho', status: 'published',
    sections: [menu, contact], spotlight_mode: 'single', spotlight_section_ids: ['menu'], theme_color: '#b8860b',
  };

  it('uses the published site for a business, keeping the business id', () => {
    const card = businessToFeedBusiness({ id: 'biz-1', owner_id: 'owner-1', business_name: 'Mewacho' }, [showroom]);
    expect(card.showroom_slug).toBe('mewacho');
    expect(card.business_id).toBe('biz-1');
    expect(card.spotlight_mode).toBe('single');
    expect(JSON.parse(card.business_sections)).toHaveLength(2);
    expect(card.business_address).toBe('Bole, Addis Ababa');
  });

  it('keeps a business without a site as it is (business profile sections)', () => {
    const card = businessToFeedBusiness({ id: 'biz-2', owner_id: 'owner-1', business_name: 'Other', business_sections: '[]' }, [showroom]);
    expect(card.showroom_slug).toBeUndefined();
    expect(card.business_id).toBe('biz-2');
  });

  it('reads stored spotlight lists in any shape', () => {
    expect(showroomToFeedBusiness({ ...showroom, spotlight_section_ids: {} }).spotlight_section_ids).toBe('[]');
  });
});
