import client from '@/lib/api/client';

/**
 * Creates a notification for a specific user.
 */
export async function createNotification(userId: string, type: string, title: string, body?: string, link?: string) {
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

