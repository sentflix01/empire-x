import type { Metadata } from 'next';

// A page title of its own and a canonical address (new-user audit NU-14);
// the page itself is a client component, so the metadata lives here.
export const metadata: Metadata = {
  title: 'Feed',
  description: 'What people and businesses near you are sharing and selling on Nodbusiness.',
  alternates: { canonical: '/feed' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
