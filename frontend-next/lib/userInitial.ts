/**
 * One initial for a person everywhere (header, post box…): their name, else
 * their email, else "?" (new-user audit NU-20: an email sign-up showed "G" in
 * the header and "E" in the post box).
 */
export function userInitial(user: { full_name?: unknown; display_name?: unknown; email?: unknown } | null | undefined): string {
  for (const v of [user?.full_name, user?.display_name, user?.email]) {
    const s = typeof v === 'string' ? v.trim() : '';
    const ch = s ? Array.from(s)[0] : '';
    if (ch && /\p{L}|\p{N}/u.test(ch)) return ch.toLocaleUpperCase();
  }
  return '?';
}
