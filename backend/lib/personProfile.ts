/**
 * One profile per person. A person can have several user_profiles rows (a
 * personal one and one per business), so joining user_profiles on user_id
 * repeats every row once per profile: chats, friends, reviews, stories and
 * search results showed the same person two or three times, and counts were
 * multiplied. Always join through here: the personal profile, else the oldest.
 */
export const PERSON_PROFILE_ORDER = `(pp.profile_type = 'personal') DESC, pp.created_at ASC, pp.id ASC`;

/** `LEFT JOIN LATERAL (…) alias ON TRUE`, or an inner join when `inner` (rows without a profile drop out, as with JOIN). */
export function personProfileJoin(userExpr: string, alias: string, inner = false): string {
  return `${inner ? 'JOIN' : 'LEFT JOIN'} LATERAL (SELECT pp.* FROM user_profiles pp WHERE pp.user_id = ${userExpr} ORDER BY ${PERSON_PROFILE_ORDER} LIMIT 1) ${alias} ON TRUE`;
}
