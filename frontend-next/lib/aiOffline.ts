/**
 * Minimal offline responses for the Nodbusiness assistant.
 * Product instructions come from the server guide prompt and must not be
 * invented or served from stale client-side rules while offline.
 */

const GREETING = /^(hi|hello|hey|selam|salam|good morning|good afternoon|good evening)\b/i;
const IDENTITY = /\b(who are you|what are you|what can you do|your name)\b/i;

/** Return only answers that are safe without current product or account data. */
export function offlineAnswer(message: string, language: "en" | "am" = "en"): string | null {
  const normalized = message.trim();
  if (GREETING.test(normalized) || normalized.startsWith("ሰላም")) {
    return language === "am"
      ? "ሰላም! እኔ የNodbusiness ረዳት ነኝ። ግንኙነት ሲኖር በመተግበሪያው ላይ ልመራዎት እችላለሁ።"
      : "Hello! I'm the Nodbusiness assistant. I can guide you through the app when a connection is available.";
  }
  if (IDENTITY.test(normalized)) {
    return language === "am"
      ? "እኔ የNodbusiness ረዳት ነኝ። ስለ መተግበሪያው መረጃ ልሰጥ እችላለሁ፤ የአሁኑን የተረጋገጠ መመሪያ ለማግኘት ግንኙነት ያስፈልጋል።"
      : "I'm the Nodbusiness assistant. I can help explain the app, but I need a connection for current, verified instructions.";
  }
  return null;
}

/** Check if the browser is currently online. */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
