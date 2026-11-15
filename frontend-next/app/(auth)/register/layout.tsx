import type { Metadata } from 'next';

// A page title of its own and a canonical address (new-user audit NU-14);
// the page itself is a client component, so the metadata lives here.
export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a free Nodbusiness account in under a minute: post, connect, build your showroom and buy or sell.',
  alternates: { canonical: '/register' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
