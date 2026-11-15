/**
 * Catches the email mistakes that make a sign-up code go nowhere (new-user
 * audit NU-7): a missing domain ending ("selam@gmial") and common misspellings
 * of big providers, with a one-tap suggestion.
 */
const FIXES: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.om': 'gmail.com', 'gmai.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
};

const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export interface EmailCheck {
  /** Plain-words problem; the address cannot be used as typed. */
  error?: 'missing' | 'shape';
  /** A likely intended address, e.g. selam@gmail.com for selam@gmial.com. */
  suggestion?: string;
}

export function checkEmail(raw: string): EmailCheck {
  const value = raw.trim();
  if (!value) return { error: 'missing' };
  const [local, domain = ''] = value.split('@');
  const lower = domain.toLowerCase();
  // "selam@gmial" (no ending) → suggest the provider when the start is close.
  const bare = Object.keys(FIXES).find((typo) => typo.split('.')[0] === lower);
  if (!SHAPE.test(value)) {
    if (bare || ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud'].includes(lower)) {
      return { error: 'shape', suggestion: `${local}@${bare ? FIXES[bare] : `${lower}.com`}` };
    }
    return { error: 'shape' };
  }
  if (FIXES[lower]) return { suggestion: `${local}@${FIXES[lower]}` };
  return {};
}
