const fs = require('node:fs');
const path = require('node:path');
const {
  BUSINESS_CONFIGS,
  BUILDER_CATEGORY,
  BUILDER_SECTIONS,
  buildSections,
} = require('../db/seed-showrooms');

describe('demo showroom seed follows the live builder data shape', () => {
  const builderSource = fs.readFileSync(path.resolve(__dirname, '../../frontend-next/lib/builderSections.ts'), 'utf8');
  const categoryMappingSource = fs.readFileSync(path.resolve(__dirname, '../../frontend-next/lib/showroomCategoryMapping.ts'), 'utf8');
  const business = {
    business_name: 'Sample Business',
    business_category: 'restaurant',
    business_template: 'restaurant_menu',
    business_description: 'A sample business description.',
    business_theme_color: '#D4AF37',
    business_contact_email: 'owner@example.test',
    business_contact_phone: '+251 911 000 000',
    business_address: 'Bole, Addis Ababa',
    business_hours: 'Mon-Sat 9AM-6PM',
  };

  test.each(Object.keys(BUSINESS_CONFIGS))('%s storefront uses builder-supported categories and section fields', (category) => {
    const sections = buildSections(category, { ...business, business_category: category });

    expect(builderSource).toContain(`cat: "${BUILDER_CATEGORY[category]}"`);
    expect(categoryMappingSource).toContain(`${category}: "${BUILDER_CATEGORY[category]}"`);
    expect(sections.map((section) => section.type)).toEqual(BUILDER_SECTIONS[category]);
    for (const section of sections) {
      expect(builderSource).toContain(`key: "${section.type}"`);
      expect(section).not.toHaveProperty('key');
      expect(section).not.toHaveProperty('content');
      expect(Object.values(section).every((value) => value !== undefined)).toBe(true);
    }
    expect(sections[0].title).toBe(business.business_name);
    expect(sections.find((section) => section.type === 'contact')).toMatchObject({
      email: business.business_contact_email,
      phone: business.business_contact_phone,
      location: business.business_address,
      hours: business.business_hours,
    });
  });
});
