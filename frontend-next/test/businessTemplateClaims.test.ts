/**
 * Business templates are copied onto a new business's public page before the
 * owner writes anything, so they must not state facts on the owner's behalf:
 * delivery times, payment methods, guarantees, years in business, deal counts,
 * opening hours or invented discounts (audit LEGAL-01; EU UCPD Art. 6, FTC Act §5).
 */
import { describe, it, expect } from 'vitest';
import { BUSINESS_CATEGORIES } from '@/lib/businessTemplates';

const FACTUAL_CLAIMS = [
  /nationwide|shipping|same-day|\bdispatch\b|delivery (in|within)|\d+\s*-?\s*min(ute)?s?\b.*deliver|free deliver/i,
  /pay(ment)? on delivery|cash on delivery|protected transactions|secure payment|safe checkout|mortgage/i,
  /\breturns?\b.*polic|refund|money.back|guarantee/i,
  /verified sellers|24\/7|always available|lifetime access/i,
  /\d+\+\s*(years|deals|speakers|clients|customers|users)/i,
  /\d+\s*%\s*off|today only|limited time only/i,
  /monday|saturday|\b\d{1,2}\s*(am|pm)\b/i,
  /in \d+ (days|minutes)|proven results/i,
];

function texts(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => texts(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => texts(v, out));
  return out;
}

describe('business templates', () => {
  const all = BUSINESS_CATEGORIES.flatMap((c) => c.templates.map((t) => ({ id: t.id, strings: texts(t.sections) })));

  it('has templates to check', () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it.each(all.map((t) => [t.id, t.strings] as const))('%s makes no factual promise for the owner', (_id, strings) => {
    const offending = strings.filter((s) => FACTUAL_CLAIMS.some((rx) => rx.test(s)));
    expect(offending).toEqual([]);
  });
});
