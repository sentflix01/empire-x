// @ts-nocheck
import client from '@/api/client';

/**
 * Creates a notification for a specific user.
 */
export async function createNotification(userId, type, title, body, link) {
  if (!userId || !title) return;
  try {
    const res = await client.post('/api/notifications', {
      user_id: userId,
      type,
      title,
      body: body || '',
      link: link || '',
    });
    return res.data;
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

