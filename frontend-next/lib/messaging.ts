'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

export type ChatContext = { kind: 'product' | 'order' | 'showroom'; id: string };

/**
 * Finds an existing 1-on-1 conversation between two users, or creates a new one.
 */
export async function findOrCreateConversation(currentUser: { id?: string } | null | undefined, targetUserId: string, _targetName?: string) {
  if (!currentUser?.id || !targetUserId) return null;
  const res = await client.post('/api/messages/conversations/find-or-create', { target_user_id: targetUserId });
  return res.data;
}

/** The customer's chat with a business (or, for the owner, with a customer about their order). */
export async function openBusinessChat(businessId: string, context?: ChatContext, customerId?: string) {
  const res = await client.post('/api/messages/conversations/business', {
    business_id: businessId, ...(context ? { context } : {}), ...(customerId ? { customer_id: customerId } : {}),
  });
  return res.data as { id: string };
}

/**
 * One way to start a chat from any "Message" button: a business chat when
 * there's a business (with a card for the product, order or showroom), a
 * personal chat otherwise. Signed-out visitors go to sign in first, and the
 * server's reason is shown when a chat isn't allowed.
 */
export function useStartChat() {
  const router = useRouter();
  const { user, isLoadingAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  // A tap right after the page opens can come before the sign-in is restored:
  // wait for it instead of sending a signed-in person to the login page.
  const auth = useRef({ user, isLoadingAuth });
  auth.current = { user, isLoadingAuth };
  const waiting = useRef<Array<() => void>>([]);
  useEffect(() => {
    if (isLoadingAuth) return;
    waiting.current.forEach((resolve) => resolve());
    waiting.current = [];
  }, [isLoadingAuth]);
  const start = useCallback(async (target: { businessId?: string | null; userId?: string | null; context?: ChatContext; customerId?: string }) => {
    if (busy) return;
    if (auth.current.isLoadingAuth) await new Promise<void>((resolve) => { waiting.current.push(resolve); });
    const user = auth.current.user;
    if (!user) { router.push(`/login?return=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    setBusy(true);
    try {
      const conv = target.businessId
        ? await openBusinessChat(target.businessId, target.context, target.customerId)
        : target.userId ? await findOrCreateConversation(user, target.userId) : null;
      if (conv?.id) router.push(`/messages/${conv.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not open the chat. Please try again.'));
    } finally { setBusy(false); }
  }, [busy, router]);
  return { start, busy };
}
