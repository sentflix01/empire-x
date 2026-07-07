// @ts-nocheck
/**
 * push.ts — Web Push subscription helpers
 * Registers the service worker, fetches the VAPID key, and
 * subscribes/unsubscribes the browser from push notifications.
 */
import client from "@/api/client";

const SW_PATH = "/sw.js";

/** Convert a URL-safe base64 string to a Uint8Array (for VAPID key). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Register the service worker (idempotent). */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

/** Returns true if push is supported and permission is granted. */
export function isPushGranted(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/** Returns the current Notification permission state. */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Request permission and subscribe to push.
 * Returns true on success.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    // Get VAPID public key from backend
    const { data } = await client.get("/api/push/vapid-public-key");
    if (!data.publicKey) return false;

    const reg = await registerSW();
    if (!reg) return false;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    // Send subscription to backend
    const sub = subscription.toJSON();
    await client.post("/api/push/subscribe", {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
    });

    return true;
  } catch {
    return false;
  }
}

/** Unsubscribe from push and remove from backend. */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return true;

    await client.delete("/api/push/subscribe", {
      data: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}
