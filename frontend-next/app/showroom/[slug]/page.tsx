'use client';
/**
 * PUBLIC showroom page (by slug) — canonical share/QR target.
 * Slugs are the stable, human-readable shareable identifier
 * (e.g. /showroom/acme-cafe-1735...). Outside the auth-gated (app)
 * route group so anonymous visitors can open it without login.
 */
import ShowroomView from '@/views/ShowroomView';

export default function PublicShowroomBySlugPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <ShowroomView />
    </div>
  );
}
