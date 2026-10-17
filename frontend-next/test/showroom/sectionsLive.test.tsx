/**
 * Every Studio section, strictly: what the owner fills in is what visitors
 * see on the published site, every button works, and no form asks for
 * things social-media users don't know (image addresses, colour or icon
 * codes, map embeds). The Studio preview renders through the same code.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('@/lib/socket', () => ({ getIO: () => null }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
const productsApi = vi.hoisted(() => ({ filterPage: vi.fn() }));
vi.mock('@/api/entities', () => ({ entities: { Product: productsApi } }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: ({ targetId }: { targetId: string }) => <button type="button">Save {targetId}</button> }));
const upload = vi.hoisted(() => ({ uploadFile: vi.fn() }));
vi.mock('@/lib/uploadFile', () => upload);

import { SECTION_TYPES } from '@/lib/builderSections';
import { serializeShowroomSections } from '@/lib/showroomSectionsCodec';
import SectionRenderer, { mapEmbedUrl, youtubeEmbedUrl } from '@/components/showroom/SectionRenderer';
import BuilderPreview from '@/components/showroom/BuilderPreview';
import PhotoField from '@/components/showroom/PhotoField';

/** What an owner might type into every section, keyed by field. */
const FILLED: Record<string, unknown> = {
  title: 'Selam Bakery', subtitle: 'Fresh bread every morning', cta: 'See our bread',
  aboutTitle: 'Our story', aboutDesc: 'Baking since 2010', aboutImage: 'https://cdn.example.test/shop.jpg',
  itemsTitle: 'Bread', items: [{ name: 'Sourdough', desc: 'Slow risen', price: '120 ETB' }],
  galleryTitle: 'Photos', galleryImages: [{ url: 'https://cdn.example.test/oven.jpg', caption: 'Our oven' }],
  servTitle: 'Services', services: [{ name: 'Cake orders', desc: 'Birthdays', price: 'From 900 ETB' }],
  testTitle: 'Customers say', testimonials: [{ quote: 'Best bread in Bole', author: 'Hana' }],
  location: 'Bole, near Medhanialem', phone: '+251 91 234 5678', email: 'hi@selam.test', hours: 'Mon–Sat 7–19', whatsapp: '+251 91 234 5678',
  facebook: 'https://facebook.com/selam', telegram: 'https://t.me/selam',
  pricingTitle: 'Packages', plans: [{ name: 'Weekly box', price: '700 ETB', features: 'Delivery, 7 loaves' }],
  teamTitle: 'Team', members: [{ name: 'Abebe', role: 'Baker' }],
  faqTitle: 'Questions', faqs: [{ question: 'Do you deliver?', answer: 'Yes, in Addis' }],
  featTitle: 'Why us', features: [{ name: 'Baked daily', desc: 'Every morning' }],
  statsTitle: 'Numbers', stats: [{ number: '5,000+', label: 'Loaves a week' }],
  portTitle: 'Our work', portfolio: [{ title: 'Wedding cake', client: 'Meron' }],
  newsTitle: 'Get our news', newsBtn: 'Sign up',
  vidTitle: 'How we bake', vidUrl: 'https://youtu.be/dQw4w9WgXcQ',
  mapTitle: 'Find us', address: 'Bole Road, Addis Ababa',
  ctaTitle: 'Order today', ctaBtn: 'Message us',
  processTitle: 'How to order', processSteps: [{ title: 'Choose', desc: 'Pick your bread' }],
  bookingTitle: 'Book a cake', bookingBtn: 'Request a booking',
  caseTitle: 'Stories', caseStudies: [{ title: 'Hotel supply', result: 'Daily order since 2024' }],
  partnersTitle: 'Partners', partners: [{ name: 'Hotel Lalibela' }],
  awardsTitle: 'Awards', awards: [{ title: 'Best Bakery 2025' }],
  industriesTitle: 'Who we serve', industries: [{ name: 'Cafés' }],
  catalogTitle: 'All products', showStock: true,
  locationTitle: 'Our van today',
  saveTitle: 'Save Selam Bakery',
};

/** Text each section must show on the live site once filled. */
const SHOWS: Record<string, string> = {
  hero: 'Fresh bread every morning', about: 'Baking since 2010', items: '120 ETB', gallery: 'Our oven', services: 'Cake orders',
  testimonials: 'Best bread in Bole', contact: 'hi@selam.test', social: 'Telegram', pricing: '700 ETB', team: 'Abebe',
  faq: 'Do you deliver?', features: 'Baked daily', stats: 'Loaves a week', portfolio: 'Wedding cake', newsletter: 'Get our news',
  video: 'How we bake', map: 'Bole Road, Addis Ababa', cta: 'Message us', process: 'Pick your bread', booking: 'Request a booking',
  caseStudies: 'Daily order since 2024', partners: 'Hotel Lalibela', awards: 'Best Bakery 2025', industries: 'Cafés',
  inventory_catalog: 'Injera pack', live_location_tracking: 'Our van today', save_showroom: 'Save Selam Bakery',
};

const product = { id: 'p1', title: 'Injera pack', price: 80, currency: 'ETB', stock: 4, category: 'Bread', images: '[]' };

beforeEach(() => {
  http.get.mockReset(); http.post.mockReset(); productsApi.filterPage.mockReset(); upload.uploadFile.mockReset();
  http.get.mockResolvedValue({ data: { available: false } });
  productsApi.filterPage.mockResolvedValue({ items: [product], nextCursor: null });
});

describe('every Studio section on the published site', () => {
  const sections = serializeShowroomSections(SECTION_TYPES.map(s => s.key), FILLED) as Array<Record<string, any>>;

  it('covers the whole catalogue', () => {
    expect(Object.keys(SHOWS).sort()).toEqual(SECTION_TYPES.map(s => s.key).sort());
  });

  it.each(sections.map((s, i) => [s.type, s, i] as const))('%s shows what the owner filled in', (type, section, i) => {
    const { container } = render(
      <SectionRenderer section={section} sectionIndex={i} products={[product]} onBuy={() => {}} onGetQuote={() => {}}
        profile={{ business_name: 'Selam Bakery' }} showroomId="site-1" businessId="biz-1" ctaTarget="#section-contact" />,
    );
    expect(container.textContent, `${type} should show "${SHOWS[type]}"`).toContain(SHOWS[type]);
    expect(container.querySelector(`#section-${i}`)).toBeTruthy();
  });
});

describe('forms use only what social-media users know', () => {
  it('asks for photos with Add photo, never image addresses, colour codes or icon codes', () => {
    for (const sec of SECTION_TYPES) {
      const fields = sec.fields.flatMap(f => [f, ...(f.itemFields ?? [])]);
      for (const f of fields) {
        expect(f.label, `${sec.key}.${f.key}`).not.toMatch(/URL|fa-|Icon|Gradient|Embed/);
        if (f.type === 'color') throw new Error(`${sec.key}.${f.key} shows a colour code`);
        if (/image|photo|logo|^url$/i.test(f.key) && !['hidden', 'repeater'].includes(f.type)) expect(f.type, `${sec.key}.${f.key}`).toBe('image');
      }
    }
  });

  it('gives every section a plain one-line purpose', () => {
    for (const sec of SECTION_TYPES) expect(sec.purpose, sec.key).toMatch(/\w/);
  });
});

describe('buttons and forms work for visitors', () => {
  it('Email sign-up saves the address and thanks the visitor', async () => {
    http.post.mockResolvedValue({ data: { ok: true } });
    render(<SectionRenderer section={{ type: 'newsletter', newsBtn: 'Sign up' }} sectionIndex={0} showroomId="site-1" />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'reader@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign up/ }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/api/showrooms/site-1/newsletter', { email: 'reader@example.test' }));
    expect(await screen.findByText(/on the list/)).toBeTruthy();
  });

  it('Email sign-up in the Studio preview explains instead of sending', () => {
    render(<SectionRenderer section={{ type: 'newsletter' }} sectionIndex={0} preview />);
    expect((screen.getByRole('button', { name: /Subscribe/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/once your website is published/)).toBeTruthy();
  });

  it('Contact details are tappable', () => {
    render(<SectionRenderer section={{ type: 'contact', phone: '+251 91 234 5678', email: 'hi@selam.test', whatsapp: '+251 91 234 5678' }} sectionIndex={0} />);
    expect(screen.getByRole('link', { name: /\+251 91 234 5678/ }).getAttribute('href')).toBe('tel:+251912345678');
    expect(screen.getByRole('link', { name: /hi@selam.test/ }).getAttribute('href')).toBe('mailto:hi@selam.test');
    expect(screen.getByRole('link', { name: /Chat on WhatsApp/ }).getAttribute('href')).toBe('https://wa.me/251912345678');
  });

  it('Product catalogue shows real products and stock only when switched on', () => {
    const { rerender } = render(<SectionRenderer section={{ type: 'inventory_catalog', catalogTitle: 'All', showStock: true }} sectionIndex={0} products={[product]} onBuy={() => {}} />);
    expect(screen.getByText('4 left')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Order' })).toBeTruthy();
    rerender(<SectionRenderer section={{ type: 'inventory_catalog', catalogTitle: 'All', showStock: false }} sectionIndex={0} products={[product]} onBuy={() => {}} />);
    expect(screen.queryByText('4 left')).toBeNull();
  });

  it('Live location shows the map while the owner shares it, and Share only to the owner', async () => {
    http.get.mockResolvedValue({ data: { available: true, lat: 9.01, lng: 38.76, updated_at: new Date().toISOString() } });
    const { unmount } = render(<SectionRenderer section={{ type: 'live_location_tracking' }} sectionIndex={0} businessId="biz-1" />);
    expect(await screen.findByTitle(/map/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Directions/ }).getAttribute('href')).toContain('9.01,38.76');
    expect(screen.queryByRole('button', { name: /Share my location/ })).toBeNull();
    unmount();
    render(<SectionRenderer section={{ type: 'live_location_tracking' }} sectionIndex={0} businessId="biz-1" isOwner />);
    expect(await screen.findByRole('button', { name: /Share my location now/ })).toBeTruthy();
  });

  it('YouTube links in any shape play; a map comes from the typed address', () => {
    for (const u of ['https://youtu.be/dQw4w9WgXcQ?si=a', 'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ']) {
      expect(youtubeEmbedUrl(u)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
    expect(youtubeEmbedUrl('https://example.test/video')).toBeNull();
    expect(mapEmbedUrl('', 'Bole Road, Addis Ababa')).toBe('https://www.google.com/maps?q=Bole%20Road%2C%20Addis%20Ababa&output=embed');
    expect(mapEmbedUrl('https://www.google.com/maps/embed?pb=1', 'x')).toBe('https://www.google.com/maps/embed?pb=1');
  });
});

describe('the Studio preview is the published renderer', () => {
  it('shows the Save button, the catalogue with real products, and a contact block', async () => {
    render(<BuilderPreview formData={FILLED} activeSections={['hero', 'inventory_catalog', 'save_showroom']} mode="mobile" showWhatsapp fontFamily="Inter" />);
    expect(screen.getByText('Save Selam Bakery')).toBeTruthy();
    expect(await screen.findByText('Injera pack')).toBeTruthy();
    expect(productsApi.filterPage).toHaveBeenCalledWith({ seller_id: 'owner-1', status: 'active' }, '-created_at', 24);
    expect(document.getElementById('section-contact')).toBeTruthy();
  });
});

describe('Add photo', () => {
  it('uploads the chosen picture and keeps its address', async () => {
    upload.uploadFile.mockResolvedValue('https://cdn.example.test/new.jpg');
    const onChange = vi.fn();
    render(<PhotoField id="p" label="Photo" value="" onChange={onChange} />);
    const file = new File(['x'], 'shop.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Photo'), { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn.example.test/new.jpg'));
  });

  it('refuses files that are not photos', async () => {
    render(<PhotoField id="p" label="Photo" value="" onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Photo'), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/Choose a photo/);
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });
});
