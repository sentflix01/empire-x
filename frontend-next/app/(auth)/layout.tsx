/**
 * Auth layout — no sidebar, no header.
 * Used by: /login, /register, /forgot-password, /reset-password, /onboarding
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
