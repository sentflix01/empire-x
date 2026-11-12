/**
 * Maximum text lengths, matching the server (backend/lib/textLimits.ts, audit
 * F-058). Inputs use them as maxLength so people are stopped while typing,
 * not after pressing Save.
 */
export const TEXT_LIMITS = {
  title: 200,
  description: 5_000,
  content: 5_000,
  business_name: 100,
} as const;
