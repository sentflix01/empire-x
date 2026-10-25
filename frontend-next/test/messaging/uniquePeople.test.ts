/**
 * A person can have several profile rows (personal and one per business);
 * contacts and chat lists show each person and each chat once.
 */
import { describe, it, expect } from 'vitest';
import { uniquePeople, uniqueChats } from '@/lib/chatDisplay';

describe('uniquePeople', () => {
  it('keeps one entry per person, preferring the personal profile, in first-seen order', () => {
    const rows = [
      { id: 'p1', user_id: 'u-alazar', display_name: 'Alazar Shop', profile_type: 'business' },
      { id: 'p2', user_id: 'u-nunu', display_name: 'Nunu', profile_type: 'personal' },
      { id: 'p3', user_id: 'u-alazar', display_name: 'Alazar Wasse', profile_type: 'personal' },
      { id: 'p4', user_id: 'u-alazar', display_name: 'Alazar Cafe', profile_type: 'business' },
      { id: 'p5', user_id: null, display_name: 'Nobody' },
    ];
    expect(uniquePeople(rows).map((r) => r.display_name)).toEqual(['Alazar Wasse', 'Nunu']);
  });
});

describe('uniqueChats', () => {
  it('drops repeated chats', () => {
    expect(uniqueChats([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'a' }]).map((c) => c.id)).toEqual(['a', 'b']);
  });
});
