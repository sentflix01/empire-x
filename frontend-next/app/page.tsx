import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Root route — redirect based on auth state.
 * Authenticated users → /feed
 * Guests → /landing
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    redirect('/feed');
  } else {
    redirect('/landing');
  }
}
