import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/api/client";

let socket: Socket | null = null;

// SSR guard — socket.io-client must never initialize during server render
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // Return a no-op stub during SSR — never connected
    return { connected: false, connect: () => {}, disconnect: () => {}, emit: () => {}, on: () => {}, off: () => {} } as unknown as Socket;
  }
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001", {
      auth: { token: getAccessToken() || "" },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  if (typeof window === 'undefined') return;
  const s = getSocket();
  // Refresh the auth token before connecting so stale tokens don't cause auth failures
  if (!s.connected) {
    (s as any).auth = { token: getAccessToken() || "" };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  // Always clear the singleton so the next connectSocket() call
  // creates a fresh instance with the current auth token.
  // This prevents stale tokens surviving logout → re-login.
  socket = null;
}
