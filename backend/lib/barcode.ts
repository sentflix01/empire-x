/**
 * Product codes from a scan: barcodes (EAN-8, UPC-A, EAN-13, EAN-14 / GTIN)
 * and QR codes carrying a GS1 Digital Link (…/01/<GTIN>/…). Anything else is
 * plain QR text, which is not a product code.
 */
export type ParsedCode = { kind: 'gtin'; gtin: string } | { kind: 'text'; text: string };

/** GS1 check digit: weights 3,1,3,1… from the right, excluding the check digit. */
export function gtinCheckDigitOk(digits: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

/** Store every GTIN as 13 digits when it fits (UPC-A gains a leading 0), so one product has one key. */
export function canonicalGtin(digits: string): string {
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 14 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function parseProductCode(raw: unknown): ParsedCode | null {
  const text = String(raw ?? '').trim();
  if (!text || text.length > 2048) return null;
  const digits = text.replace(/[\s-]/g, '');
  if (/^\d+$/.test(digits) && gtinCheckDigitOk(digits)) return { kind: 'gtin', gtin: canonicalGtin(digits) };
  // GS1 Digital Link: https://example.com/01/09506000134352/10/ABC?...
  const link = /\/01\/(\d{8}|\d{12,14})(?:[/?#]|$)/.exec(text);
  if (link && gtinCheckDigitOk(link[1])) return { kind: 'gtin', gtin: canonicalGtin(link[1]) };
  return { kind: 'text', text: text.slice(0, 500) };
}
