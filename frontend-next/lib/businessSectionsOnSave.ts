import { getTemplateById, type TemplateSection } from '@/lib/businessTemplates';

/** The sections a business had when the edit form loaded, and the template they came from. */
export interface LoadedBusinessSections { category: string; template: string; sections: TemplateSection[] }

/**
 * The sections to save with a business profile. A new business starts from its
 * template. An edit keeps the owner's current sections (owner, 16 Nov 2026:
 * "only use the user's current updated sections, not new sample"); only a new
 * category or template starts again from that template.
 */
export function businessSectionsToSave(
  { isEdit, loaded, category, template }: { isEdit: boolean; loaded: LoadedBusinessSections | null; category: string; template: string },
): TemplateSection[] {
  if (isEdit && loaded && loaded.sections.length > 0 && loaded.category === category && loaded.template === template) {
    return loaded.sections;
  }
  return getTemplateById(category, template)?.sections || [];
}
