/**
 * lib/webPush.ts — loads web-push for push notifications (routes/push.ts).
 *
 * web-push 4 is published as an ES module only. Node 22.12+ (the backend
 * runtime, see backend/package.json engines) loads it with require(). If it
 * ever fails to load, that is logged as an error, not hidden: push
 * notifications would otherwise switch off without anyone noticing (TD-029).
 */
import logger from './logger';

export interface PushSubscriptionTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushApi {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: PushSubscriptionTarget, payload: string): Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const requireWebPush = (): unknown => require('web-push');

/** The web-push API, or null (logged as an error) when it cannot be loaded. */
export function loadWebPush(load: () => unknown = requireWebPush): WebPushApi | null {
  try {
    const mod = load() as Partial<WebPushApi> & { default?: Partial<WebPushApi> };
    const api = typeof mod?.sendNotification === 'function' ? mod : mod?.default;
    if (typeof api?.setVapidDetails !== 'function' || typeof api?.sendNotification !== 'function') {
      throw new Error('web-push has no setVapidDetails/sendNotification');
    }
    return api as WebPushApi;
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'web-push could not be loaded: push notifications are off');
    return null;
  }
}
