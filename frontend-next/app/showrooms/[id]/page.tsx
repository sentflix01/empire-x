'use client';
/**
 * PUBLIC showroom page (by id) — outside the auth-gated (app) route group,
 * mirroring the /p/[username] pattern. Accessible by anonymous visitors;
 * ShowroomView itself enforces the published-only rule for non-owners.
 * Keeps the legacy /showrooms/[id] share links/bookmarks working.
 */
import ShowroomView from '@/views/ShowroomView';

export default function PublicShowroomByIdPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <ShowroomView />
    </div>
  );
}
