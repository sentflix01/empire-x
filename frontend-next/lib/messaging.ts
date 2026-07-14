import client from '@/api/client';

/**
 * Finds an existing 1-on-1 conversation between two users, or creates a new one.
 */
export async function findOrCreateConversation(currentUser, targetUserId, targetName) {
  if (!currentUser?.id || !targetUserId) return null;
  const res = await client.post('/api/messages/conversations/find-or-create', {
    target_user_id: targetUserId,
    target_name: targetName,
  });
  return res.data;
}

