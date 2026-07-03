// Allow window extensions used across the app
interface Window {
  __googleSignIn?: () => Promise<void>;
}

// Allow any object as record
type AnyRecord = Record<string, unknown>;
