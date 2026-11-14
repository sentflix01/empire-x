/**
 * Studio field rules match the server (backend/lib/showroomInput.ts), so the
 * owner sees a problem next to the field instead of a failed publish.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { checkField, fieldRule, normaliseUrl } from '@/lib/builderFieldRules';

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));
import BuilderForm from '@/components/showroom/BuilderForm';

describe('fieldRule / checkField', () => {
  it('uses the server limits for the name and the one-line description', () => {
    expect(fieldRule('title')).toMatchObject({ maxLength: 120, counter: true });
    expect(fieldRule('subtitle')).toMatchObject({ maxLength: 1000, counter: true });
    expect(fieldRule('story')).toMatchObject({ maxLength: 5000, counter: false });
  });

  it('gives phones, emails and links the right keyboard', () => {
    expect(fieldRule('whatsapp', 'WhatsApp number').inputType).toBe('tel');
    expect(fieldRule('email').inputType).toBe('email');
    expect(fieldRule('vidUrl', 'YouTube link').inputType).toBe('url');
    expect(fieldRule('location', 'Address or landmark').inputType).toBe('text');
  });

  it('checks phones, emails and links in plain words; empty is fine', () => {
    const phone = fieldRule('phone'); const email = fieldRule('email'); const url = fieldRule('facebook', 'Facebook page link');
    expect(checkField(phone, '')).toBeNull();
    expect(checkField(phone, '+251 91 234 5678')).toBeNull();
    expect(checkField(phone, 'call me')).toMatch(/digits/);
    expect(checkField(email, 'selam@example.com')).toBeNull();
    expect(checkField(email, 'selam@')).toMatch(/name@example.com/);
    expect(checkField(url, 'https://facebook.com/selam')).toBeNull();
    expect(checkField(url, 'facebook.com/selam')).toBeNull();
    expect(checkField(url, 'javascript:alert(1)')).toMatch(/not allowed/);
    expect(checkField(url, 'selam')).toMatch(/full web address/);
    expect(checkField(fieldRule('title'), 'x'.repeat(121))).toMatch(/120/);
  });

  it('adds https:// to a bare address', () => {
    expect(normaliseUrl('facebook.com/selam')).toBe('https://facebook.com/selam');
    expect(normaliseUrl('https://t.me/x')).toBe('https://t.me/x');
    expect(normaliseUrl('')).toBe('');
  });
});

describe('BuilderForm fields', () => {
  it('shows a counter on the name, and a message under a wrong link only after leaving the field', () => {
    const onChange = vi.fn();
    const { rerender } = render(<BuilderForm activeSections={['hero', 'social']} formData={{ title: 'Selam', facebook: '' }} onChange={onChange} />);
    expect(screen.getByText('5 / 120')).toBeTruthy();
    const link = screen.getByLabelText('Facebook page link') as HTMLInputElement;
    expect(link.type).toBe('url');
    rerender(<BuilderForm activeSections={['hero', 'social']} formData={{ title: 'Selam', facebook: 'selam' }} onChange={onChange} />);
    expect(screen.queryByText(/full web address/)).toBeNull();
    fireEvent.blur(screen.getByLabelText('Facebook page link'));
    expect(screen.getByText(/full web address/)).toBeTruthy();
    expect(screen.getByLabelText('Facebook page link').getAttribute('aria-invalid')).toBe('true');
  });

  it('tidies a bare link when the owner leaves the field', () => {
    const onChange = vi.fn();
    render(<BuilderForm activeSections={['social']} formData={{ facebook: 'facebook.com/selam' }} onChange={onChange} />);
    fireEvent.blur(screen.getByLabelText('Facebook page link'));
    expect(onChange).toHaveBeenCalledWith('facebook', 'https://facebook.com/selam');
  });
});
