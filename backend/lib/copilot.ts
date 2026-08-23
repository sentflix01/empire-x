/**
 * lib/copilot.ts — DevOps Copilot intent parser (pure, unit-tested)
 *
 * Turns a chat message into a safe, whitelisted operational intent.
 * Slash commands are exact; natural language falls back to keyword matching.
 * Execution lives in routes/devops.ts — this file never touches IO.
 */
export type CopilotIntent =
  | { intent: 'help' }
  | { intent: 'health' }
  | { intent: 'errors'; hours: number }
  | { intent: 'resolve'; fingerprint: string }
  | { intent: 'flags' }
  | { intent: 'flag_set'; flag: string; enabled: boolean }
  | { intent: 'telemetry'; type: string | null }
  | { intent: 'backup' }
  | { intent: 'items'; open: boolean }
  | { intent: 'add_item'; kind: 'bug' | 'feature' | 'task'; title: string; description: string }
  | { intent: 'done_item'; query: string }
  | { intent: 'unknown' };

export function parseIntent(raw: string): CopilotIntent {
  const msg = (raw || '').trim();
  if (!msg) return { intent: 'unknown' };
  const low = msg.toLowerCase();

  if (low === '/help' || low === 'help') return { intent: 'help' };
  if (low === '/health' || low === 'health' || low === 'status') return { intent: 'health' };
  if (low === '/flags') return { intent: 'flags' };
  if (low === '/backup' || low === 'run backup') return { intent: 'backup' };

  if (low.startsWith('/errors') || /^errors?\b.*last/.test(low)) {
    const h = parseInt((low.match(/(\d+)\s*h/)?.[1]) ?? low.split(/\s+/)[1] ?? '24', 10);
    return { intent: 'errors', hours: Number.isFinite(h) ? Math.min(Math.max(h, 1), 720) : 24 };
  }
  if (low.startsWith('/resolve ') || /^resolve\s+\S/.test(low)) {
    const fp = msg.replace(/^\/?resolve\s+/i, '').trim();
    if (fp) return { intent: 'resolve', fingerprint: fp };
  }
  if (low.startsWith('/flag ')) {
    const parts = msg.split(/\s+/);
    if (parts[1]) return { intent: 'flag_set', flag: parts[1], enabled: parts[2] !== 'off' && parts[2] !== 'false' };
  }
  if (/^(turn|switch)\s+(on|off)\s+/i.test(msg)) {
    const m = msg.match(/(?:turn|switch)\s+(on|off)\s+([a-z0-9_]+)/i);
    if (m) return { intent: 'flag_set', flag: m[2], enabled: m[1].toLowerCase() === 'on' };
  }
  if (low.startsWith('/telemetry')) {
    return { intent: 'telemetry', type: msg.split(/\s+/)[1] || null };
  }
  if (low.startsWith('/items') || low === 'open items' || low === 'show items') {
    return { intent: 'items', open: !low.includes('all') };
  }
  const addMatch = msg.match(/^\/?(bug|feature|task)\s+(.+)/i) || msg.match(/^(?:add|create)\s+(?:a\s+)?(bug|feature|task)\s*[:\-]?\s*(.+)/i);
  if (addMatch) {
    const kind = addMatch[1].toLowerCase() as 'bug' | 'feature' | 'task';
    const body = addMatch[2].trim();
    const [title, description = ''] = body.split(/\s*\|\s*/);
    if (title) return { intent: 'add_item', kind, title, description };
  }
  if (low.startsWith('/done ') || /^(mark|close)\s+.*\s+(done|fixed|resolved)/i.test(low)) {
    const q = msg.replace(/^\/done\s+/i, '').replace(/^(?:mark|close)\s+/i, '').replace(/\s+(done|fixed|resolved)[.!]?$/i, '').trim();
    if (q) return { intent: 'done_item', query: q };
  }
  return { intent: 'unknown' };
}

export const COPILOT_HELP = [
  '**DevOps Copilot — available commands**',
  '`/health` — system status + evaluated alerts',
  '`/errors [hours]` — top unresolved error fingerprints',
  '`/resolve <fingerprint|prefix>` — mark an error resolved',
  '`/flags` — list feature flags',
  '`/flag <name> on|off` — flip a feature flag (Redis live-flip)',
  '`/telemetry [type]` — 24h event counts + recent stream',
  '`/backup` — start a database backup now',
  '`/items [all]` — list board items',
  '`/bug <title> | <description>` — add a bug to the board',
  '`/feature <title> | <desc>` · `/task <title> | <desc>`',
  '`/done <title-substring>` — close a board item',
].join('\n');
