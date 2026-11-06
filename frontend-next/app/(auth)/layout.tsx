/**
 * Auth layout — no sidebar, no header.
 * Used by: /login, /register, /forgot-password, /reset-password, /onboarding
 */
import MainContent from '@/components/layout/MainContent';

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <MainContent>{children}</MainContent>;
}
