import MessagesShell from '@/components/messaging/MessagesShell';

/** Keeps the chat list beside the open chat on tablets and computers. */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <MessagesShell>{children}</MessagesShell>;
}
