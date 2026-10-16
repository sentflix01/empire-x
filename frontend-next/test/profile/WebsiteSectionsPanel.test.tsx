/**
 * "Your website" on the business profile editor: a published site's sections
 * are edited and saved in place; drafts and missing sites point to Studio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const showroomApi = vi.hoisted(() => ({ filter: vi.fn(), update: vi.fn() }));
vi.mock('@/api/entities', () => ({ entities: { Showroom: showroomApi } }));

import WebsiteSectionsPanel from '@/components/profile/WebsiteSectionsPanel';
import { toast } from 'sonner';

const publishedSite = {
  id: 'site-1', title: 'Mountain Climb', status: 'published',
  sections: JSON.stringify([
    { type: 'hero', title: 'Mountain Climb', subtitle: 'Guided treks' },
    { type: 'about', aboutTitle: 'About Us' },
  ]),
};

describe('WebsiteSectionsPanel', () => {
  beforeEach(() => { showroomApi.filter.mockReset(); showroomApi.update.mockReset(); });

  it("shows every section of the published site and saves edits to it", async () => {
    showroomApi.filter.mockResolvedValue([publishedSite]);
    showroomApi.update.mockResolvedValue({ ...publishedSite });
    render(<WebsiteSectionsPanel />);
    expect(await screen.findByText('Hero Banner')).toBeTruthy();
    expect(screen.getByText('About Us', { selector: 'span' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /View site/ }).getAttribute('href')).toBe('/showrooms/site-1');

    const save = screen.getByRole('button', { name: /Save website/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByDisplayValue('Guided treks'), { target: { value: 'Guided treks in Simien' } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    await waitFor(() => expect(showroomApi.update).toHaveBeenCalled());
    const [id, changes] = showroomApi.update.mock.calls[0];
    expect(id).toBe('site-1');
    expect(changes).not.toHaveProperty('slug');
    expect(changes).not.toHaveProperty('title');
    expect(changes.description).toBe('Guided treks in Simien');
    expect(JSON.parse(changes.sections)).toEqual([
      { type: 'hero', title: 'Mountain Climb', subtitle: 'Guided treks in Simien' },
      { type: 'about', aboutTitle: 'About Us' },
    ]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Website updated'));
  });

  it('shows the API message when the save is refused', async () => {
    showroomApi.filter.mockResolvedValue([publishedSite]);
    showroomApi.update.mockRejectedValue({ error: 'subscription_required', message: 'Your selected sections require the Premium plan to publish.', status: 402 });
    render(<WebsiteSectionsPanel />);
    fireEvent.change(await screen.findByDisplayValue('Guided treks'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Save website/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Your selected sections require the Premium plan to publish.'));
  });

  it('sends a draft owner back to Studio', async () => {
    showroomApi.filter.mockResolvedValue([{ id: 'draft-1', status: 'draft', sections: '[]' }]);
    render(<WebsiteSectionsPanel />);
    const link = await screen.findByRole('link', { name: 'Continue in Studio' });
    expect(link.getAttribute('href')).toBe('/showroom/create?edit=draft-1');
  });

  it('offers to build a website when there is none', async () => {
    showroomApi.filter.mockResolvedValue([]);
    render(<WebsiteSectionsPanel />);
    expect((await screen.findByRole('link', { name: 'Build your website' })).getAttribute('href')).toMatch(/^\/showroom\/create/);
  });
});
