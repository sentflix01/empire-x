/**
 * M4: every emoji for reactions (posts, comments, messages), emoji in the chat
 * and comment boxes, and the pinned-message bar.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// The full picker is a lazy web component; stand in a button that picks 🦒.
vi.mock('next/dynamic', () => ({
  default: () => function FakePicker({ onPick, label }: { onPick: (e: string) => void; label?: string }) {
    return <button type="button" onClick={() => onPick('🦒')}>{`pick giraffe (${label})`}</button>;
  },
}));

import ReactionPicker from '@/components/feed/ReactionPicker';
import MessageReactions, { reactionCount, reactedByMe } from '@/components/messaging/MessageReactions';
import EmojiInsertButton, { insertAtCursor } from '@/components/ui/EmojiInsertButton';
import PinnedBar, { pinPreviewText } from '@/components/messaging/PinnedBar';

describe('ReactionPicker', () => {
  it('picks from the quick row, and "+" opens every emoji', () => {
    const onPick = vi.fn();
    render(<ReactionPicker onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /love/i }));
    expect(onPick).toHaveBeenLastCalledWith('❤️');
    const more = screen.getByRole('button', { name: 'More emojis' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    fireEvent.click(screen.getByRole('button', { name: /pick giraffe/ }));
    expect(onPick).toHaveBeenLastCalledWith('🦒');
    // The full picker closes after a pick.
    expect(screen.queryByRole('button', { name: /pick giraffe/ })).toBeNull();
  });

  it('keeps your own uncommon reaction visible and marked', () => {
    render(<ReactionPicker current="🦒" onPick={() => {}} />);
    expect(screen.getByRole('button', { name: 'React with 🦒' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MessageReactions', () => {
  it('shows counts from the { count, users } shape and old bare counts', () => {
    expect(reactionCount({ count: 2, users: ['a', 'b'] })).toBe(2);
    expect(reactionCount(3)).toBe(3);
    expect(reactedByMe({ count: 1, users: ['me'] }, 'me')).toBe(true);
    expect(reactedByMe(3, 'me')).toBe(false);
    render(<MessageReactions messageId="m1" currentUserId="me" onToggle={() => {}}
      reactions={{ '🦒': { count: 2, users: ['me', 'x'] }, '🔥': 1, '😢': { count: 0, users: [] } }} />);
    expect(screen.queryByText('[object Object]')).toBeNull();
    expect(screen.getByRole('button', { name: /🦒, 2 reactions, including yours/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /🔥, 1 reaction\. Tap to add yours/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /😢/ })).toBeNull();
  });

  it('tapping your own chip removes it, another adds yours', () => {
    const onToggle = vi.fn();
    render(<MessageReactions messageId="m1" currentUserId="me" onToggle={onToggle}
      reactions={{ '🦒': { count: 1, users: ['me'] }, '🔥': { count: 1, users: ['x'] } }} />);
    fireEvent.click(screen.getByRole('button', { name: /🦒/ }));
    expect(onToggle).toHaveBeenLastCalledWith('🦒', true);
    fireEvent.click(screen.getByRole('button', { name: /🔥/ }));
    expect(onToggle).toHaveBeenLastCalledWith('🔥', false);
  });
});

describe('EmojiInsertButton', () => {
  it('inserts at the cursor or replaces the selection', () => {
    const el = document.createElement('input');
    el.value = 'hello world';
    el.setSelectionRange(5, 5);
    expect(insertAtCursor('hello world', '👋', el)).toEqual({ value: 'hello👋 world', cursor: 7 });
    el.setSelectionRange(6, 11);
    expect(insertAtCursor('hello world', '🌍', el).value).toBe('hello 🌍');
    expect(insertAtCursor('hi', '🙂', null)).toEqual({ value: 'hi🙂', cursor: 4 });
  });

  it('opens the picker and passes the new text on', () => {
    const onChange = vi.fn();
    function Box() {
      const ref = React.useRef<HTMLInputElement | null>(null);
      return <><input ref={ref} defaultValue="hi" /><EmojiInsertButton value="hi" inputRef={ref} onChange={onChange} /></>;
    }
    render(<Box />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert emoji' }));
    fireEvent.click(screen.getByRole('button', { name: /pick giraffe/ }));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('🦒'));
  });
});

describe('PinnedBar', () => {
  it('shows the newest pin and steps through older ones on each tap', () => {
    const onJump = vi.fn().mockReturnValue(true);
    render(<PinnedBar onJump={onJump} pins={[{ id: 'b', text: 'Address: Bole road' }, { id: 'a', text: 'Opening hours' }]} />);
    const bar = screen.getByRole('button', { name: /Pinned message 1 of 2: Address: Bole road/ });
    fireEvent.click(bar);
    expect(onJump).toHaveBeenLastCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: /2 of 2: Opening hours/ }));
    expect(onJump).toHaveBeenLastCalledWith('a');
    expect(screen.getByRole('button', { name: /1 of 2/ })).toBeInTheDocument();
  });

  it('shows nothing without pins, and plain words for non-text messages', () => {
    const { container } = render(<PinnedBar pins={[]} onJump={() => true} />);
    expect(container).toBeEmptyDOMElement();
    expect(pinPreviewText({ type: 'image', content: 'https://x/y.jpg' })).toBe('Photo');
    expect(pinPreviewText({ type: 'text', content: '  Hi  ' })).toBe('Hi');
  });
});
