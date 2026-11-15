/**
 * Where a person goes right after signing up or in (new-user audit NU-1,
 * 15 Nov 2026): someone with no profile yet goes straight to the name screen.
 * Before, they landed on the feed and AppLayout moved them to /onboarding a
 * moment later, losing anything they had started typing.
 */
import { entities } from '@/lib/api/entities';

export async function destinationAfterSignIn(userId: string | undefined, wanted = '/feed'): Promise<string> {
  if (!userId) return wanted;
  try {
    const profiles = await entities.UserProfile.filter({ user_id: userId });
    if (profiles.length === 0) {
      return wanted && wanted !== '/feed' ? `/onboarding?return=${encodeURIComponent(wanted)}` : '/onboarding';
    }
  } catch { /* the layout checks again */ }
  return wanted;
}
