'use client';
import { redirect } from 'next/navigation';

// /settings redirects to /account
export default function SettingsPage() {
  redirect('/account');
}
