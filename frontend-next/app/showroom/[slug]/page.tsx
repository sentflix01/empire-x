/**
 * PUBLIC showroom page (by slug) — canonical share/QR target.
 * Slugs are the stable, human-readable shareable identifier
 * (e.g. /showroom/acme-cafe-1735...). Outside the auth-gated (app)
 * route group so anonymous visitors can open it without login.
 * Server component so shared links get a real preview (generateMetadata);
 * the interactive page is the client ShowroomView.
 */
import type { Metadata } from 'next';
import ShowroomView from '@/views/ShowroomView';
import QrVisitorActions from '@/components/showroom/QrVisitorActions';
import { showroomMetadata } from '@/lib/sharePreview';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return showroomMetadata(slug);
}

export default function PublicShowroomBySlugPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <QrVisitorActions />
      <ShowroomView />
    </div>
  );
}
