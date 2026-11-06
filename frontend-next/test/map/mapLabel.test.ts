/** Map marker labels show names as text, never as HTML (audit F-057). */
import { describe, it, expect } from 'vitest';
import { escapeHtml, markerLabelHtml } from '@/lib/mapLabel';

describe('markerLabelHtml', () => {
  it('escapes markup so it cannot become an element', () => {
    const html = markerLabelHtml('<img src=x onerror=f()>');
    expect(html).not.toContain('<');
    const box = document.createElement('div');
    box.innerHTML = html;
    expect(box.querySelector('img')).toBeNull();
    expect(box.textContent).toBe('<img src=x onerror…');
  });

  it('shortens before escaping, so an entity is never cut', () => {
    expect(markerLabelHtml('Tom & Jerry Coffee & Tea House')).toBe('Tom &amp; Jerry Coffee…');
    expect(markerLabelHtml('A & B')).toBe('A &amp; B');
    expect(markerLabelHtml(null)).toBe('');
  });

  it('escapes quotes for attribute contexts', () => {
    expect(escapeHtml(`"x" 'y'`)).toBe('&quot;x&quot; &#39;y&#39;');
  });
});
