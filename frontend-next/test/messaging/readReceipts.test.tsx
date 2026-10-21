/**
 * Message ticks: sending / sent / delivered / seen, groups needing everyone,
 * live receipt events, and the labelled tick icon.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { applyReceipt, tickFor } from '@/lib/readReceipts';
import MessageTicks from '@/components/messaging/MessageTicks';

const sent = { created_at: '2026-10-18T10:00:00Z' };
const before = '2026-10-18T09:59:00Z';
const after = '2026-10-18T10:01:00Z';

describe('tickFor', () => {
  it('goes from sending to sent, delivered and seen', () => {
    expect(tickFor({ ...sent, _temp: true }, 'me', [])).toBe('sending');
    expect(tickFor({ ...sent, _failed: true }, 'me', [])).toBe('failed');
    expect(tickFor(sent, 'me', [{ user_id: 'me' }, { user_id: 'b', last_delivered_at: before }])).toBe('sent');
    expect(tickFor(sent, 'me', [{ user_id: 'b', last_delivered_at: after }])).toBe('delivered');
    expect(tickFor(sent, 'me', [{ user_id: 'b', last_delivered_at: after, last_read_at: after }])).toBe('seen');
  });

  it('never shows seen when read receipts hide it (null), only delivered', () => {
    expect(tickFor(sent, 'me', [{ user_id: 'b', last_delivered_at: after, last_read_at: null }])).toBe('delivered');
  });

  it('needs every other member in a group', () => {
    const group = [{ user_id: 'b', last_read_at: after }, { user_id: 'c', last_delivered_at: after }];
    expect(tickFor(sent, 'me', group)).toBe('delivered');
    expect(tickFor(sent, 'me', [...group, { user_id: 'd' }])).toBe('sent');
  });
});

describe('applyReceipt', () => {
  it('moves a member forward, never backwards', () => {
    const members = [{ user_id: 'b', last_read_at: after }];
    expect(applyReceipt(members, { user_id: 'b', last_read_at: before })[0].last_read_at).toBe(after);
    expect(applyReceipt(members, { user_id: 'b', last_delivered_at: after })[0].last_delivered_at).toBe(after);
    expect(applyReceipt(members, { user_id: 'x', last_read_at: after })).toEqual(members);
  });
});

describe('MessageTicks', () => {
  it('is labelled for screen readers', () => {
    render(<MessageTicks tick="seen" />);
    expect(screen.getByRole('img', { name: 'Seen' }).getAttribute('data-tick')).toBe('seen');
  });
});
