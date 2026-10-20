/**
 * Offline send queue — persists pending (unsent) messages in IndexedDB so
 * they survive page refreshes.  The database is named 'msgQueue', version 1,
 * with a single object store 'pending' whose key is the message's UUID id.
 */

export interface PendingMessage {
  id: string;
  conversationId: string;
  content: string;
  type: string;
  replyToId: string | null;
  createdAt: string;
}

const DB_NAME = 'msgQueue';
const DB_VERSION = 1;
const STORE = 'pending';

/** Opens (and, on first use, initialises) the IndexedDB database. */
function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: false });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/** Generates a RFC-4122 v4 UUID using the Web Crypto API. */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persists a pending message to IndexedDB and resolves with the generated id.
 */
export function enqueuePendingMessage(
  msg: Omit<PendingMessage, 'id'>,
): Promise<string> {
  return openDB().then(
    (db) =>
      new Promise<string>((resolve, reject) => {
        const id = generateUUID();
        const record: PendingMessage = { ...msg, id };
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const request: IDBRequest<IDBValidKey> = store.add(record);

        request.onsuccess = () => resolve(id);
        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error);
        };
      }),
  );
}

/**
 * Returns all pending messages for a specific conversation, ordered by
 * createdAt ascending.
 */
export function getPendingMessages(
  conversationId: string,
): Promise<PendingMessage[]> {
  return openDB().then(
    (db) =>
      new Promise<PendingMessage[]>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const request: IDBRequest<PendingMessage[]> = store.getAll() as IDBRequest<PendingMessage[]>;

        request.onsuccess = (event: Event) => {
          const all = (event.target as IDBRequest<PendingMessage[]>).result;
          const filtered = all
            .filter((m) => m.conversationId === conversationId)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          resolve(filtered);
        };

        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error);
        };
      }),
  );
}

/**
 * Removes a single pending message by its id.
 */
export function removePendingMessage(id: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const request: IDBRequest<undefined> = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error);
        };
      }),
  );
}

/**
 * Returns every pending message across all conversations (used on reconnect
 * to flush the entire queue).
 */
export function getAllPendingMessages(): Promise<PendingMessage[]> {
  return openDB().then(
    (db) =>
      new Promise<PendingMessage[]>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const request: IDBRequest<PendingMessage[]> = store.getAll() as IDBRequest<PendingMessage[]>;

        request.onsuccess = (event: Event) => {
          const all = (event.target as IDBRequest<PendingMessage[]>).result;
          resolve(
            all.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            ),
          );
        };

        request.onerror = (event: Event) => {
          reject((event.target as IDBRequest).error);
        };
      }),
  );
}
