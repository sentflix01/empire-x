/**
 * M5 chat UI: which actions a message offers (Save, Copy link and Translate
 * are gone), how chats are named, the composer's Enter key and per-chat
 * drafts, the "New messages" line, and the inbox tabs (the Business tab reads
 * the business box; it used to filter a list that never holds those chats).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, getAccessToken: () => 't' }));
vi.mock('@/api/entities', () => ({ entities: { UserProfile: { list: vi.fn().mockResolvedValue([]) } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me', full_name: 'Me' } }) }));
vi.mock('@/lib/useChatPresence', () => ({ useChatPresence: () => undefined }));
vi.mock('@/lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }), connectSocket: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/messages' }));
vi.mock('next/dynamic', () => ({ default: () => function Picker() { return null; } }));

import { messageActions, messagePreview, EDIT_WINDOW_MS } from '@/lib/chatRules';
import { chatTitle, chatAvatar, chatOtherUserId } from '@/lib/chatDisplay';
import MessageActions from '@/components/messaging/MessageActions';
import Composer from '@/components/messaging/Composer';
import MessageList from '@/components/messaging/MessageList';
import Inbox from '@/components/messaging/Inbox';

const now = Date.now();
const msg = (over: Record<string, unknown> = {}) => ({ id: 'm1', sender_id: 'me', content: 'Hi', type: 'text', created_at: new Date(now - 60_000).toISOString(), ...over });

beforeEach(() => {
  Object.values(http).forEach((f) => f.mockReset());
  try { localStorage.clear(); } catch { /* none */ }
  // jsdom has no scrolling.
  Element.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;
});

describe('message actions', () => {
  it('own recent text: edit and delete for everyone; others: report, no edit', () => {
    expect(messageActions(msg(), 'me', now)).toMatchObject({ reply: true, copy: true, edit: true, deleteForEveryone: true, report: false });
    expect(messageActions(msg({ sender_id: 'other' }), 'me', now)).toMatchObject({ edit: false, deleteForEveryone: false, deleteForMe: true, report: true });
  });
  it('closes the edit window after 15 minutes and delete-for-everyone after 24 hours', () => {
    const old = msg({ created_at: new Date(now - EDIT_WINDOW_MS - 1000).toISOString() });
    expect(messageActions(old, 'me', now)).toMatchObject({ edit: false, deleteForEveryone: true });
    expect(messageActions(msg({ created_at: new Date(now - 25 * 3600_000).toISOString() }), 'me', now).deleteForEveryone).toBe(false);
  });
  it('photos are not copied or edited; unsent messages have no actions', () => {
    expect(messageActions(msg({ type: 'image', content: 'https://x/y.jpg' }), 'me', now)).toMatchObject({ copy: false, edit: false, forward: true });
    expect(messageActions(msg({ _failed: true }), 'me', now)).toMatchObject({ reply: false, react: false, pin: false, deleteForMe: false });
    expect(messagePreview({ type: 'image', content: 'u' })).toBe('Photo');
  });

  it('shows Reply, Copy, Forward, Pin, Edit, Delete; never Save, Copy link or Translate', () => {
    const h = { onReact: vi.fn(), onReply: vi.fn(), onCopy: vi.fn(), onForward: vi.fn(), onPin: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReport: vi.fn(), onClose: vi.fn() };
    render(<MessageActions message={msg()} me="me" pinned={false} reducedMotion {...h} />);
    const sheet = screen.getByRole('dialog', { name: 'Message actions' });
    for (const label of ['Reply', 'Copy', 'Forward', 'Pin', 'Edit', 'Delete']) expect(within(sheet).getByRole('button', { name: label })).toBeTruthy();
    for (const gone of [/save/i, /copy link/i, /translate/i]) expect(within(sheet).queryByRole('button', { name: gone })).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Delete for everyone' }));
    expect(h.onDelete).toHaveBeenCalledWith('everyone');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(h.onClose).toHaveBeenCalled();
  });
});

describe('chat names', () => {
  it('a customer sees the business; groups show their name; DMs the other person', () => {
    expect(chatTitle({ id: 'c', type: 'dm', business_id: 'b', business_name: 'Bole Cafe', is_business_side: false, other_name: 'Owner' }, 'me')).toBe('Bole Cafe');
    expect(chatTitle({ id: 'c', type: 'dm', business_id: 'b', business_name: 'Bole Cafe', is_business_side: true, other_name: 'Abebe' }, 'me')).toBe('Abebe');
    expect(chatTitle({ id: 'c', type: 'group', name: '' }, 'me')).toBe('Group');
    expect(chatTitle({ id: 'c', type: 'dm', participant_ids: '["me","u2"]', participant_names: '["Me","Sara"]' }, 'me')).toBe('Sara');
    expect(chatAvatar({ id: 'c', type: 'dm', business_id: 'b', is_business_side: false, business_logo: 'logo.png' })).toBe('logo.png');
    expect(chatOtherUserId({ id: 'c', type: 'dm', participant_ids: ['me', 'u2'] }, 'me')).toBe('u2');
  });
});

describe('composer', () => {
  const props = () => ({ onSend: vi.fn(), onSaveEdit: vi.fn(), onCancelReply: vi.fn(), onCancelEdit: vi.fn(), onTyping: vi.fn(), onPickPhotos: vi.fn() });
  const coarse = (on: boolean) => { window.matchMedia = vi.fn().mockReturnValue({ matches: on, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia; };

  it('computer: Enter sends, Shift+Enter is a new line', () => {
    coarse(false);
    const p = props();
    render(<Composer conversationId="c1" {...p} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(box, { target: { value: '  Hello  ' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(p.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(p.onSend).toHaveBeenCalledWith('Hello');
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('phone: Enter is a new line; the Send button sends', () => {
    coarse(true);
    const p = props();
    render(<Composer conversationId="c1" {...p} />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(box, { target: { value: 'Hi' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(p.onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(p.onSend).toHaveBeenCalledWith('Hi');
  });

  it('keeps an unsent draft per chat', async () => {
    coarse(false);
    const { unmount } = render(<Composer conversationId="c1" {...props()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'half-written' } });
    unmount();
    render(<Composer key="c2" conversationId="c2" {...props()} />);
    expect((screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement).value).toBe('');
    expect(localStorage.getItem('nodbusiness:chat-draft:c1')).toBe('half-written');
  });
});

describe('message list', () => {
  it('groups by day, marks where unread starts and says when it reached the start', () => {
    const list = [
      msg({ id: 'a', created_at: '2026-10-20T09:00:00Z', content: 'Old' }),
      msg({ id: 'b', created_at: new Date(now - 1000).toISOString(), content: 'New', sender_id: 'u2' }),
    ];
    render(<MessageList messages={list} loading={false} hasOlder={false} loadingOlder={false} onLoadOlder={vi.fn()} firstUnreadId="b"
      typing newFromOthers={0} empty={null} renderMessage={(m) => <p key={m.id}>{m.content}</p>} />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'New messages' })).toBeTruthy();
    expect(screen.getByText('Start of the conversation')).toBeTruthy();
    expect(screen.getByText('typing…')).toBeTruthy();
  });
});

describe('inbox', () => {
  it('opens on Chats and shows Business and Requests from their own lists', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    http.get.mockImplementation((url: string, cfg?: { params?: { box?: string } }) => {
      const box = cfg?.params?.box;
      if (url === '/api/messages/conversations' && box === 'chats') return Promise.resolve({ data: [{ id: 'c1', type: 'dm', other_name: 'Sara', last_message_id: 'x', last_message: 'See you', unread_count: 0 }] });
      if (box === 'business') return Promise.resolve({ data: [{ id: 'c2', type: 'dm', other_name: 'Customer A', business_id: 'b', business_name: 'Bole Cafe', is_business_side: true, last_message_id: 'y', last_message: 'Is it open?', unread_count: 2 }] });
      if (box === 'requests') return Promise.resolve({ data: [{ id: 'c3', type: 'dm', other_name: 'Stranger', is_request: true, unread_count: 1 }] });
      return Promise.resolve({ data: { status: 'offline' } });
    });
    render(<Inbox />);
    await waitFor(() => expect(screen.getByText('Sara')).toBeTruthy());
    expect(screen.getByRole('tab', { name: /Chats/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /Business/ }));
    expect(screen.getByText('Customer A')).toBeTruthy();
    expect(screen.queryByText('Sara')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Requests/ }));
    expect(screen.getByText('Stranger')).toBeTruthy();
  });
});
