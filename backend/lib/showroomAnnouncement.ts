/**
 * lib/showroomAnnouncement.ts — Put a newly published business site in front of
 * its owner's followers: one announcement post (feed) per showroom plus an
 * in-app notification for each follower. Best effort: publishing never fails
 * because of this.
 */
import pool from '../db/pool';
import logger from './logger';

export interface PublishedShowroom {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_image?: string | null;
}

const MAX_FOLLOWER_NOTIFICATIONS = 5000;

export async function announceShowroomPublished(showroom: PublishedShowroom): Promise<boolean> {
  try {
    const link = `/showroom/${encodeURIComponent(showroom.slug)}`;
    const blurb = showroom.description?.trim() ? `\n\n${showroom.description.trim().slice(0, 280)}` : '';
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO posts (author_id, content, image_url, post_type, link_url, showroom_id)
       VALUES ($1, $2, $3, 'text', $4, $5)
       ON CONFLICT (showroom_id) WHERE showroom_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [showroom.owner_id, `${showroom.title} is now live on Nodbusiness.${blurb}`, showroom.cover_image ?? null, link, showroom.id],
    );
    if (!rows.length) return false; // already announced (e.g. re-published)
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read)
       SELECT f.follower_id, 'business_published', $2, $3, $4, FALSE
         FROM follows f WHERE f.followed_id = $1
        LIMIT ${MAX_FOLLOWER_NOTIFICATIONS}`,
      [showroom.owner_id, `${showroom.title} is now live`, 'A business you follow just published its site.', link],
    );
    return true;
  } catch (err) {
    logger.warn({ err: (err as Error).message, showroomId: showroom.id }, 'Showroom announcement failed');
    return false;
  }
}
