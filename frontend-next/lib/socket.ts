import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/api/client";

let socket: Socket | null = null;

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
      auth: { token: getAccessToken() || "" },
      transports: ["websocket", "polling"],
      autoConnect: false,
      // Reconnection settings — back off slowly to avoid HMR WebSocket interference
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
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
  if (s.connected || (s as any).connecting) return;
  // Refresh the auth token before connecting
  (s as any).auth = { token: getAccessToken() || "" };
  s.connect();
}

export function disconnectSocket(): void {
  if (!socket) return;
  // Remove all app-level listeners but keep the socket instance alive.
  // Destroying the singleton on every unmount (React Strict Mode runs
  // mount → unmount → remount) creates rapid WebSocket churn which
  // disrupts Next.js HMR and causes [HMR] connected spam.
  socket.removeAllListeners();
  if (socket.connected) {
    socket.disconnect();
  }
  // Only null the singleton on deliberate logout — not on every unmount.
  // resetSocket() below is the logout path.
}

/**
 * Hard-reset the socket singleton — call on logout only.
 * This ensures the next login gets a fresh socket with the new auth token.
 */
export function resetSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export const getIO = getSocket;
