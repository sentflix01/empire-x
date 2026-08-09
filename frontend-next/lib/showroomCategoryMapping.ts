/**
 * showroomCategoryMapping.ts
 *
 * Static mapping between the business profile taxonomy
 * (BUSINESS_CATEGORIES values in lib/businessTemplates.ts) and the
 * Showroom Studio builder taxonomy (BUILDER_CATEGORY_META categories
 * in lib/builderSections.ts).
 *
 * Used by ProfileEdit (Business tab) to deep-link into the unified
 * Showroom Studio wizard with a preselected builder category.
 */

/** business_category value → BUILDER_CATEGORY_META category name */
export const BUSINESS_TO_BUILDER_CATEGORY: Record<string, string> = {
  shop: "Business & Commerce",
  course: "Education",
  service: "Professional Services",
  restaurant: "Food & Beverage",
  portfolio: "Professional Services",
  event: "Hospitality & Tourism",
  realestate: "Business & Commerce",
  health: "Health & Medical",
  other: "Business & Commerce",
};

/**
 * Resolve the Showroom Studio builder category for a business_category
 * value. Returns an empty string when no mapping exists.
 */
export function getBuilderCategoryForBusiness(businessCategoryValue: string): string {
  if (!businessCategoryValue) return "";
  return BUSINESS_TO_BUILDER_CATEGORY[businessCategoryValue] || "";
}

/** URL-safe builder category for deep links (?category= param). */
export function getBuilderCategoryQuery(businessCategoryValue: string): string {
  const cat = getBuilderCategoryForBusiness(businessCategoryValue);
  return cat ? encodeURIComponent(cat) : "";
}
