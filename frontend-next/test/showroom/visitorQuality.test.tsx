/**
 * What visitors see on a published website (audit 2026-11-14,
 * docs/audits/2026-11-showroom-builder-audit.md):
 * - a section the owner left unfilled is hidden from visitors, shown to the owner;
 * - an empty gallery never shows stock photos as if they were the business's;
 * - sample contact details (made-up phone, email, address) block publishing;
 * - Studio does not invent opening hours.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SectionRenderer, { sectionHasOwnerContent } from '@/components/showroom/SectionRenderer';
import { findSamplePlaceholders, getShowroomTemplateSample } from '@/lib/showroomTemplateSamples';

const EMPTY = [
  { type: 'gallery', galleryTitle: 'Gallery', galleryImages: [] },
  { type: 'menu', menuTitle: 'Menu', dishes: [] },
  { type: 'delivery', deliveryTitle: 'Delivery Options', deliveryZones: [{ zone: '', fee: '', time: '' }], deliveryNote: '' },
  { type: 'faq', faqTitle: 'Questions', faqs: [] },
  { type: 'social', facebook: '', instagram: '' },
  { type: 'about', aboutTitle: 'About us', aboutDesc: '  ' },
];

describe('unfilled sections', () => {
  it('are hidden from visitors', () => {
    for (const section of EMPTY) {
      expect(sectionHasOwnerContent(section), section.type).toBe(false);
      const { container } = render(<SectionRenderer section={section as any} sectionIndex={0} profile={{}} />);
      expect(container.textContent, section.type).toBe('');
    }
  });

  it('are still shown to the owner, to fill in', () => {
    const { container } = render(<SectionRenderer section={EMPTY[0] as any} sectionIndex={0} profile={{}} isOwner />);
    expect(container.textContent).toContain('Add your photos in Studio');
    expect(container.querySelector('img')).toBeNull();
  });

  it('show as soon as one item is filled', () => {
    const faq = { type: 'faq', faqTitle: 'Questions', faqs: [{ question: 'Open Sundays?', answer: 'Yes' }] };
    expect(sectionHasOwnerContent(faq)).toBe(true);
    const { container } = render(<SectionRenderer section={faq as any} sectionIndex={0} profile={{}} />);
    expect(container.textContent).toContain('Open Sundays?');
  });

  it('an empty gallery uses the business cover photos, never stock photos', () => {
    const { container } = render(<SectionRenderer section={EMPTY[0] as any} sectionIndex={0} profile={{ business_cover_url: '/uploads/shop.jpg' }} />);
    const srcs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src') || '');
    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs.join(' ')).not.toMatch(/picsum/);
  });
});

describe('sample placeholders', () => {
  it('a sample unchanged is caught before publishing, by field', () => {
    const sample = getShowroomTemplateSample('Coffee Shop', 'Food & Beverage', 'starter').formData as Record<string, unknown>;
    expect(findSamplePlaceholders(sample)).toEqual(expect.arrayContaining(['Address', 'Phone', 'Email', 'WhatsApp']));
    expect(sample.hours ?? '').toBe('');
  });

  it("the owner's own details, or cleared fields, pass", () => {
    expect(findSamplePlaceholders({ phone: '+251 922 000 111', email: 'me@selam.et', location: '', whatsapp: '' })).toEqual([]);
    expect(findSamplePlaceholders({ phone: ' +251  911 234 567 ' })).toEqual(['Phone']);
  });
});
