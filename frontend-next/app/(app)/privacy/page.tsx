'use client';
import AccountSettingsView from '@/views/AccountSettings';

// Shows the Privacy tab of settings
export default function PrivacyPage() {
  return <AccountSettingsView defaultTab="privacy" />;
}
