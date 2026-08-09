import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Fix #4: SSR guard — localStorage does not exist in Node.js
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    // Return a no-op stub during SSR — never connected
    return { connected: false, connect: () => {}, disconnect: () => {}, emit: () => {}, on: () => {}, off: () => {} } as unknown as Socket;
  }
  if (!socket) {
    const token = localStorage.getItem("access_token") || "";
    socket = io(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001", {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  if (typeof window === 'undefined') return;
  const s = getSocket();
  // Fix #13: refresh the auth token before connecting so stale tokens don't cause auth failures
  if (!s.connected) {
    const freshToken = localStorage.getItem("access_token") || "";
    (s as any).auth = { token: freshToken };
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
