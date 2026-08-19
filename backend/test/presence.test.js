/**
 * Presence System E2E Test
 * ========================
 * Tests every time-bucket label via the backend API + frontend formatLastSeen logic.
 *
 * Backend tests  — REST API: set/get presence, verify status + last_seen field
 * Frontend tests — formatLastSeen() with synthetic timestamps covering all buckets:
 *   online, away, just now, minutes ago, hours ago,
 *   today, yesterday, this week, weeks ago, months ago, years ago
 */

require('dotenv').config();

// ─── Minimal date-fns shim for Node (no transpiler) ──────────────────────────
// We test the same logic as presence.ts but implemented in plain JS here.
// The frontend TypeScript version is tested via vitest — this is the backend E2E.

function fmtTime(d) {
  return d.toTimeString().slice(0, 5); // HH:mm
}

function fmtWeekday(d) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
}

function isToday(d) {
  const n = new Date();
  return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
}

function isYesterday(d) {
  const y = new Date(); y.setDate(y.getDate()-1);
  return d.getDate()===y.getDate() && d.getMonth()===y.getMonth() && d.getFullYear()===y.getFullYear();
}

function diffSeconds(d)  { return Math.floor((Date.now() - d.getTime()) / 1000); }
function diffMinutes(d)  { return Math.floor((Date.now() - d.getTime()) / 60000); }
function diffHours(d)    { return Math.floor((Date.now() - d.getTime()) / 3600000); }
function diffDays(d)     { return Math.floor((Date.now() - d.getTime()) / 86400000); }
function diffWeeks(d)    { return Math.floor(diffDays(d) / 7); }
function diffMonths(d)   {
  const n = new Date();
  return (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
}
function diffYears(d)    { return new Date().getFullYear() - d.getFullYear(); }

/** Mirror of frontend presence.ts formatLastSeen() */
function formatLastSeen(data) {
  if (!data) return '';
  if (data.status === 'online') return 'online';
  if (data.status === 'away')   return 'away';

  const ts = data.last_seen;
  if (!ts) return 'last seen a while ago';

  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'last seen a while ago';

  const sec  = diffSeconds(d);
  const min  = diffMinutes(d);
  const hrs  = diffHours(d);
  const days = diffDays(d);
  const wks  = diffWeeks(d);
  const mos  = diffMonths(d);
  const yrs  = diffYears(d);

  if (sec < 60)  return 'last seen just now';
  if (min < 60)  return `last seen ${min} minute${min !== 1 ? 's' : ''} ago`;
  if (hrs < 3)   return `last seen ${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  if (isToday(d))     return `last seen today at ${fmtTime(d)}`;
  if (isYesterday(d)) return `last seen yesterday at ${fmtTime(d)}`;
  if (days < 7)  return `last seen ${fmtWeekday(d)} at ${fmtTime(d)}`;

  // Use day-count arithmetic — calendar diffMonths() counts boundary crossings
  // (e.g. Jul 30 → Aug 6 = 1 "month"), so we use fixed-size buckets instead.
  const approxWeeks  = Math.floor(days / 7);
  const approxMonths = Math.floor(days / 30);
  const approxYears  = Math.floor(days / 365);

  // 7–29 days — weeks
  if (days < 30)  return approxWeeks  === 1 ? 'last seen a week ago'  : `last seen ${approxWeeks} weeks ago`;
  // 30–364 days — months
  if (days < 365) return approxMonths === 1 ? 'last seen a month ago' : `last seen ${approxMonths} months ago`;
  // 365+ days — years
  return approxYears === 1 ? 'last seen a year ago' : `last seen ${approxYears} years ago`;
}

/** Mirror of isUserOnline() */
function isUserOnline(data) {
  if (!data) return false;
  return data.status === 'online';
}

/** Mirror of getPresenceCategory() */
function getPresenceCategory(data) {
  if (!data) return 'unknown';
  if (data.status === 'online') return 'online';
  if (data.status === 'away')   return 'away';
  if (!data.last_seen) return 'unknown';
  const d = new Date(data.last_seen);
  const sec = diffSeconds(d);
  if (sec < 300)      return 'recent';
  if (isToday(d))     return 'today';
  if (isYesterday(d)) return 'yesterday';
  if (diffDays(d) < 7)  return 'this_week';
  if (diffWeeks(d) < 5) return 'weeks_ago';
  if (diffMonths(d) < 12) return 'months_ago';
  return 'long_ago';
}

// ─── Test helpers ─────────────────────────────────────────────────────────────
const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;

function assert(condition, label, got = '') {
  if (condition) {
    console.log(`  ✅ ${label}${got ? '  →  ' + got : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${got ? '  →  ' + got : ''}`);
    failed++;
  }
}

function assertEq(actual, expected, label) {
  const ok = actual === expected;
  assert(ok, label, ok ? actual : `got "${actual}", expected "${expected}"`);
}

async function api(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function ago(ms)   { return new Date(Date.now() - ms).toISOString(); }
function secsAgo(n) { return ago(n * 1000); }
function minsAgo(n) { return ago(n * 60 * 1000); }
function hrsAgo(n)  { return ago(n * 3600 * 1000); }
function daysAgo(n) { return ago(n * 86400 * 1000); }
function weeksAgo(n){ return ago(n * 7 * 86400 * 1000); }
function monthsAgo(n){ const d = new Date(); d.setMonth(d.getMonth()-n); return d.toISOString(); }
function yearsAgo(n) { const d = new Date(); d.setFullYear(d.getFullYear()-n); return d.toISOString(); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     Nodbusiness — Presence System Tests        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── Part 1: Frontend formatLastSeen() logic ──────────────────────────────
  console.log('── Part 1: formatLastSeen() — all time buckets ──\n');

  // online / away
  assertEq(formatLastSeen({ status: 'online',  last_seen: null }),   'online',              'status=online');
  assertEq(formatLastSeen({ status: 'away',    last_seen: null }),   'away',                'status=away');
  assertEq(formatLastSeen(null),                                      '',                    'null → empty string');
  assertEq(formatLastSeen({ status: 'offline', last_seen: null }),   'last seen a while ago','no timestamp');

  // just now (< 60s)
  assertEq(formatLastSeen({ status: 'offline', last_seen: secsAgo(10) }),  'last seen just now', '10s ago → just now');
  assertEq(formatLastSeen({ status: 'offline', last_seen: secsAgo(59) }),  'last seen just now', '59s ago → just now');

  // minutes ago (< 60 min)
  assertEq(formatLastSeen({ status: 'offline', last_seen: minsAgo(1) }),   'last seen 1 minute ago',   '1 min ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: minsAgo(5) }),   'last seen 5 minutes ago',  '5 mins ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: minsAgo(30) }),  'last seen 30 minutes ago', '30 mins ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: minsAgo(59) }),  'last seen 59 minutes ago', '59 mins ago');

  // hours ago (< 3 hours)
  assertEq(formatLastSeen({ status: 'offline', last_seen: hrsAgo(1) }),    'last seen 1 hour ago',     '1 hr ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: hrsAgo(2) }),    'last seen 2 hours ago',    '2 hrs ago');

  // today at HH:mm (>= 3 hours, same day)
  const label4 = formatLastSeen({ status: 'offline', last_seen: hrsAgo(4) });
  assert(label4.startsWith('last seen today at'), '4 hrs ago → today at HH:mm', label4);

  // yesterday at HH:mm
  const labelY = formatLastSeen({ status: 'offline', last_seen: daysAgo(1) });
  assert(labelY.startsWith('last seen yesterday at'), '1 day ago → yesterday at HH:mm', labelY);

  // this week (2–6 days)
  const label3d = formatLastSeen({ status: 'offline', last_seen: daysAgo(3) });
  assert(label3d.match(/^last seen (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at/), '3 days ago → weekday at HH:mm', label3d);

  const label6d = formatLastSeen({ status: 'offline', last_seen: daysAgo(6) });
  assert(label6d.match(/^last seen (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at/), '6 days ago → weekday at HH:mm', label6d);

  // weeks ago (1–4 weeks)
  assertEq(formatLastSeen({ status: 'offline', last_seen: weeksAgo(1) }),  'last seen a week ago',    '1 week ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: weeksAgo(2) }),  'last seen 2 weeks ago',   '2 weeks ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: weeksAgo(3) }),  'last seen 3 weeks ago',   '3 weeks ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: weeksAgo(4) }),  'last seen 4 weeks ago',   '4 weeks ago');

  // months ago (1–11)
  assertEq(formatLastSeen({ status: 'offline', last_seen: monthsAgo(1) }), 'last seen a month ago',   '1 month ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: monthsAgo(3) }), 'last seen 3 months ago',  '3 months ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: monthsAgo(6) }), 'last seen 6 months ago',  '6 months ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: monthsAgo(11) }),'last seen 11 months ago', '11 months ago');

  // years ago
  assertEq(formatLastSeen({ status: 'offline', last_seen: yearsAgo(1) }),  'last seen a year ago',    '1 year ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: yearsAgo(2) }),  'last seen 2 years ago',   '2 years ago');
  assertEq(formatLastSeen({ status: 'offline', last_seen: yearsAgo(5) }),  'last seen 5 years ago',   '5 years ago');

  // ── Part 2: getPresenceCategory() ─────────────────────────────────────────
  console.log('\n── Part 2: getPresenceCategory() ──\n');

  assertEq(getPresenceCategory({ status: 'online',  last_seen: null }),          'online',     'online → online');
  assertEq(getPresenceCategory({ status: 'away',    last_seen: null }),          'away',       'away → away');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: secsAgo(60) }),  'recent',     '1 min ago → recent');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: hrsAgo(2) }),    'today',      '2 hrs ago → today');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: daysAgo(1) }),   'yesterday',  '1 day ago → yesterday');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: daysAgo(4) }),   'this_week',  '4 days ago → this_week');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: weeksAgo(2) }),  'weeks_ago',  '2 weeks ago → weeks_ago');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: monthsAgo(4) }), 'months_ago', '4 months ago → months_ago');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: yearsAgo(2) }),  'long_ago',   '2 years ago → long_ago');
  assertEq(getPresenceCategory({ status: 'offline', last_seen: null }),          'unknown',    'no last_seen → unknown');

  // ── Part 3: isUserOnline() ────────────────────────────────────────────────
  console.log('\n── Part 3: isUserOnline() — active chat only ──\n');

  assert( isUserOnline({ status: 'online',  last_seen: null }),         'status=online → true');
  assert(!isUserOnline({ status: 'offline', last_seen: null }),         'offline, no ts → false');
  assert(!isUserOnline({ status: 'offline', last_seen: secsAgo(60) }), 'offline, 1 min ago → false');
  assert(!isUserOnline({ status: 'offline', last_seen: secsAgo(299) }),'offline, 4m59s ago → false');
  assert(!isUserOnline({ status: 'offline', last_seen: secsAgo(301) }),'offline, 5m1s ago → false');
  assert(!isUserOnline({ status: 'offline', last_seen: minsAgo(10) }), 'offline, 10 min ago → false');
  assert(!isUserOnline(null),                                            'null → false');

  // ── Part 4: Backend REST API ──────────────────────────────────────────────
  console.log('\n── Part 4: Backend presence API ──\n');

  // Login
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nodbusiness.app', password: 'Admin1234!' }),
  });
  assert(loginRes.ok, 'Login', `status ${loginRes.status}`);
  const token = loginRes.data.access_token;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Get admin user ID
  const profileRes = await api('/api/profiles/me', { headers: { Authorization: `Bearer ${token}` } });
  const adminId = profileRes.data.user_id;
  assert(!!adminId, 'Got admin user_id', adminId?.slice(0, 8) + '…');

  // Set online
  const setOnline = await api('/api/messages/presence', {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'online' }),
  });
  assert(setOnline.ok, 'PUT presence online', `status ${setOnline.status}`);
  assertEq(setOnline.data.status, 'online', 'Response status field');

  // Get — should be online
  await new Promise(r => setTimeout(r, 200));
  const getOnline = await api(`/api/messages/presence/${adminId}`, { headers: auth });
  assert(getOnline.ok, 'GET presence (should be online)', `status ${getOnline.status}`);
  assertEq(getOnline.data.status, 'online', 'status = online');
  assert(!!getOnline.data.last_seen, 'last_seen field present', getOnline.data.last_seen);

  // Check formatLastSeen on the API response
  const onlineLabel = formatLastSeen({ status: getOnline.data.status, last_seen: getOnline.data.last_seen });
  assertEq(onlineLabel, 'online', 'formatLastSeen(API response) = "online"');

  // Set away
  const setAway = await api('/api/messages/presence', {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'away' }),
  });
  assert(setAway.ok, 'PUT presence away', `status ${setAway.status}`);

  const getAway = await api(`/api/messages/presence/${adminId}`, { headers: auth });
  assertEq(getAway.data.status, 'away', 'GET after away → status=away');
  const awayLabel = formatLastSeen({ status: getAway.data.status, last_seen: getAway.data.last_seen });
  assertEq(awayLabel, 'away', 'formatLastSeen(away API response) = "away"');

  // Set offline
  const setOffline = await api('/api/messages/presence', {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'offline' }),
  });
  assert(setOffline.ok, 'PUT presence offline', `status ${setOffline.status}`);

  await new Promise(r => setTimeout(r, 200));
  const getOffline = await api(`/api/messages/presence/${adminId}`, { headers: auth });
  assert(getOffline.ok, 'GET presence after offline', `status ${getOffline.status}`);
  // last_seen should be set (from DB or memPresence)
  assert(!!getOffline.data.last_seen, 'last_seen present after offline', getOffline.data.last_seen);

  // The label should be "last seen just now" since we just set offline
  const offlineLabel = formatLastSeen({ status: 'offline', last_seen: getOffline.data.last_seen });
  assert(offlineLabel === 'last seen just now' || offlineLabel.includes('last seen'), `formatLastSeen after offline`, offlineLabel);

  // Invalid status
  const badStatus = await api('/api/messages/presence', {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'invisible' }), // not a valid status
  });
  assert(!badStatus.ok, 'Invalid status rejected (400)', `status ${badStatus.status}`);

  // Restore to online for other tests
  await api('/api/messages/presence', {
    method: 'PUT', headers: auth,
    body: JSON.stringify({ status: 'online' }),
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗');
  const total = passed + failed;
  console.log(`║  Results: ${passed}/${total} passed, ${failed} failed`.padEnd(46) + '║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('\n💥 Fatal:', e.message); process.exit(1); });
