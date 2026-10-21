import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/api/client";

let socket: Socket | null = null;
/** Chat rooms this tab is in, joined again after every reconnect. */
const joinedConversations = new Set<string>();

// SSR guard — socket.io-client must never initialize during server render
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // Return a no-op stub during SSR — never connected
    return {
      connected: false,
      connect: () => {},
      disconnect: () => {},
      emit: () => {},
      on: () => {},
      off: () => {},
      removeAllListeners: () => {},
    } as unknown as Socket;
  }
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001", {
      // A function, so every (re)connect uses the current access token — tokens
      // refresh while the app is open and a stale one would be refused.
      auth: (cb) => cb({ token: getAccessToken() || "" }),
      transports: ["websocket", "polling"],
      autoConnect: false,
      // Reconnection settings — back off slowly to avoid HMR WebSocket interference
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });
    // The server forgets rooms when a connection drops: join them again.
    socket.on("connect", () => {
      for (const id of joinedConversations) socket?.emit("join_conversation", id);
    });
  }
  return socket;
}

export function connectSocket(): void {
  if (typeof window === 'undefined') return;
  const s = getSocket();
  // Only connect if not already connected or connecting.
  // React Strict Mode double-invokes effects — this guard prevents
  // creating duplicate connections that flood the console.
  if (s.connected || (s as unknown as { connecting?: boolean }).connecting) return;
  s.connect();
}

/** Receive a chat's live events (new messages, typing, edits) until left. */
export function joinConversation(id: string): void {
  joinedConversations.add(id);
  const s = getSocket();
  if (s.connected) s.emit("join_conversation", id);
  else connectSocket();
}

export function leaveConversation(id: string): void {
  joinedConversations.delete(id);
  const s = getSocket();
  if (s.connected) s.emit("leave_conversation", id);
}

/**
 * Kept for older callers: closes the connection but leaves every listener in
 * place (removing them all used to silence open chats). Logout uses resetSocket.
 */
export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

/**
 * Hard-reset the socket singleton — call on logout only.
 * This ensures the next login gets a fresh socket with the new auth token.
 */
export function resetSocket(): void {
  joinedConversations.clear();
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export const getIO = getSocket;
