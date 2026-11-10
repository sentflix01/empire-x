/**
 * PUBLIC showroom page (by slug) — canonical share/QR target.
 * Slugs are the stable, human-readable shareable identifier
 * (e.g. /showroom/acme-cafe-1735...). Outside the auth-gated (app)
 * route group so anonymous visitors can open it without login.
 * Server component so shared links get a real preview (generateMetadata);
 * the interactive page is the client ShowroomView.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ShowroomView from '@/views/ShowroomView';
import MainContent from '@/components/layout/MainContent';
import QrVisitorActions from '@/components/showroom/QrVisitorActions';
import { showroomMetadata } from '@/lib/sharePreview';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return showroomMetadata(slug);
}

export default async function PublicShowroomBySlugPage() {
  // The non-sensitive sign-in hint cookie (set at login, see api/client.ts).
  const likelyGuest = (await cookies()).get('nb_auth')?.value !== '1';
  return (
    <MainContent className="min-h-screen bg-background px-4 py-6">
      <QrVisitorActions likelyGuest={likelyGuest} />
      <ShowroomView />
    </MainContent>
  );
}
