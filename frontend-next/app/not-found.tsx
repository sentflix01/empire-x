import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">👑</div>
        <h1 className="font-display text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground text-lg mb-8">
          This page doesn&apos;t exist on Empire X.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
