/**
 * Identity documents go to private storage (audit F-013): the form uploads to
 * /api/verification/documents, previews the file from the device, and submits
 * only the private references — never a public upload URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import client from '@/lib/api/client';
import VerificationRequest from '@/components/profile/VerificationRequest';

const photo = (name: string, type = 'image/png') => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });

describe('VerificationRequest keeps identity documents private', () => {
  beforeEach(() => {
    vi.mocked(client.get).mockResolvedValue({ data: { is_verified: false, verification_type: null, verified_at: null, request: null } });
    vi.mocked(client.post).mockReset();
    vi.mocked(client.post).mockImplementation(async (url: string, body?: unknown) => {
      if (url === '/api/verification/documents') {
        const kind = (body as FormData).get('kind');
        return { data: { ref: `private:verification/user-1/${kind}.png`, kind } };
      }
      return { data: { id: 'request-1', status: 'pending' } };
    });
    globalThis.URL.createObjectURL = vi.fn((file: Blob) => `blob:local/${(file as File).name}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('uploads both documents privately and submits only their references', async () => {
    const { container } = render(<VerificationRequest />);
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    await screen.findByText('Step 1 — Selfie Photo');

    const selfieInput = container.querySelector<HTMLInputElement>('input[type="file"][capture="user"]');
    fireEvent.change(selfieInput!, { target: { files: [photo('me.png')] } });
    await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
    const idInput = container.querySelector<HTMLInputElement>('input[type="file"][accept="image/*,application/pdf"]');
    fireEvent.change(idInput!, { target: { files: [photo('id.png')] } });
    await waitFor(() => expect(client.post).toHaveBeenCalledTimes(2));

    const uploads = vi.mocked(client.post).mock.calls.filter(([url]) => url === '/api/verification/documents');
    expect(uploads.map(([, body]) => (body as FormData).get('kind'))).toEqual(['selfie', 'id']);
    expect(vi.mocked(client.post).mock.calls.some(([url]) => String(url).startsWith('/api/upload'))).toBe(false);

    // Previews come from the device, not from storage.
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('src') ?? '').not.toMatch(/^https?:/);

    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));
    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/api/verification/request', {
      selfie_ref: 'private:verification/user-1/selfie.png',
      id_document_ref: 'private:verification/user-1/id.png',
      verification_type: 'personal',
    }));
  });
});
