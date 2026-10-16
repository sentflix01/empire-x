import fs from 'node:fs';
import path from 'node:path';

const { BIZ_TEMPLATES, buildBusinessSections, getBusinessTemplate, ETHIOPIAN_NAMES, BUSINESSES_PER_USER } = require('../db/seed');

describe('business seed matches the current business creation flow', () => {
  const frontendTemplates = fs.readFileSync(
    path.resolve(__dirname, '../../frontend-next/lib/businessTemplates.ts'),
    'utf8',
  );

  it('uses category and template IDs that exist in the business creation UI', () => {
    for (const template of BIZ_TEMPLATES) {
      expect(frontendTemplates).toContain(`value: "${template.category}"`);
      expect(frontendTemplates).toContain(`id: "${template.template}"`);
    }
  });

  it('preserves the intended 50-owner and 150-business fixture size', () => {
    expect(ETHIOPIAN_NAMES).toHaveLength(50);
    expect(ETHIOPIAN_NAMES.length * BUSINESSES_PER_USER).toBe(150);
  });

  it('rotates primary business categories across all six templates', () => {
    const primaryCategories = new Set(ETHIOPIAN_NAMES.map((_, ownerIndex) => getBusinessTemplate(ownerIndex, 0).category));
    expect(primaryCategories).toEqual(new Set(BIZ_TEMPLATES.map((template) => template.category)));
    for (let ownerIndex = 0; ownerIndex < ETHIOPIAN_NAMES.length; ownerIndex++) {
      const ownerCategories = Array.from({ length: BUSINESSES_PER_USER }, (_, businessIndex) => getBusinessTemplate(ownerIndex, businessIndex).category);
      expect(new Set(ownerCategories).size).toBe(BUSINESSES_PER_USER);
    }
  });

  it('fills the hero, about, and contact sections with the seeded business values', () => {
    const template = BIZ_TEMPLATES.find((item) => item.category === 'shop');
    const business = {
      business_name: 'Bole Fashion Bole 1',
      business_description: 'A sample clothing shop serving Bole.',
      business_contact_email: 'owner@nodbusiness.test',
      business_contact_phone: '+251 911 234 567',
      business_address: 'Bole, Addis Ababa, Ethiopia',
    };
    const sections = buildBusinessSections(business, template);

    expect(sections[0]).toMatchObject({
      type: 'hero',
      title: business.business_name,
      subtitle: business.business_description,
      cta: template.cta,
      visible: true,
    });
    expect(sections.find((section) => section.type === 'about').content).toBe(business.business_description);
    expect(sections.find((section) => section.type === 'contact')).toMatchObject({
      email: business.business_contact_email,
      phone: business.business_contact_phone,
      location: business.business_address,
    });
    expect(sections.map((section) => section.type)).toEqual(template.sectionTypes);
  });
});
