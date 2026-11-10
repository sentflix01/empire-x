'use client';
/**
 * ProfilePeek with its enter/exit animation. Loaded on demand (next/dynamic)
 * by feed cards so framer-motion stays out of the feed's first-load script.
 */
import { AnimatePresence } from 'framer-motion';
import ProfilePeek, { type ProfilePeekProps } from '@/components/profile/ProfilePeek';

export default function ProfilePeekPresence({ open, ...props }: ProfilePeekProps & { open: boolean }) {
  return <AnimatePresence>{open && <ProfilePeek {...props} />}</AnimatePresence>;
}
