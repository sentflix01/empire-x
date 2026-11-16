import { describe, it, expect } from 'vitest';
import { businessSectionsToSave } from '@/lib/businessSectionsOnSave';
import { getTemplateById } from '@/lib/businessTemplates';

// Owner, 16 Nov 2026: editing a business must keep its current sections, never reset them to samples.
describe('businessSectionsToSave', () => {
  const template = getTemplateById('shop', 'shop_grid')?.sections ?? [];
  const current = [{ type: 'hero', title: 'My real shop' }, { type: 'items', items: [{ name: 'Real dress', price: 'ETB 2,400' }] }];

  it('starts a new business from its template', () => {
    expect(template.length).toBeGreaterThan(0);
    expect(businessSectionsToSave({ isEdit: false, loaded: null, category: 'shop', template: 'shop_grid' })).toEqual(template);
  });

  it('keeps the current sections when an edit keeps the same template', () => {
    const loaded = { category: 'shop', template: 'shop_grid', sections: current };
    expect(businessSectionsToSave({ isEdit: true, loaded, category: 'shop', template: 'shop_grid' })).toBe(current);
  });

  it('starts again from the new template only when the owner picks another one', () => {
    const loaded = { category: 'shop', template: 'shop_grid', sections: current };
    const other = businessSectionsToSave({ isEdit: true, loaded, category: 'shop', template: 'shop_boutique' });
    expect(other).toEqual(getTemplateById('shop', 'shop_boutique')?.sections ?? []);
  });

  it('uses the template when the business had no sections yet', () => {
    const loaded = { category: 'shop', template: 'shop_grid', sections: [] };
    expect(businessSectionsToSave({ isEdit: true, loaded, category: 'shop', template: 'shop_grid' })).toEqual(template);
  });
});
