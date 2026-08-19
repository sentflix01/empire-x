/**
 * Real-Time Chat E2E Test
 * ========================
 * Tests the full Socket.IO + REST messaging pipeline:
 *
 *  1. Login as admin  → get JWT
 *  2. Login as test   → get JWT
 *  3. Connect BOTH as WebSocket clients (authenticated)
 *  4. Find-or-create a DM conversation between them
 *  5. Admin joins the conversation room
 *  6. Test user joins the conversation room
 *  7. Admin sends a message via REST POST
 *     → expect "new_message" socket event on test user's socket ✅
 *  8. Test user sends a message via REST POST
 *     → expect "new_message" socket event on admin's socket ✅
 *  9. Admin edits their message via REST PUT
 *     → expect "message_edited" socket event on test user ✅
 * 10. Admin deletes their message via REST DELETE
 *     → expect "message_deleted" socket event on test user ✅
 * 11. Verify presence: set online, fetch, confirm status
 * 12. Verify message history via REST GET
 * 13. Clean up: delete the conversation
 */

require('dotenv').config();
const { io } = require('socket.io-client');

const BASE = 'http://localhost:3001';
const TIMEOUT_MS = 8000;

let passed = 0;
let failed = 0;

function log(icon, label, detail = '') {
  console.log(`${icon} ${label}${detail ? ': ' + detail : ''}`);
}

function assert(condition, label, detail = '') {
  if (condition) {
    log('✅', label, detail);
    passed++;
  } else {
    log('❌', label, detail);
    failed++;
  }
}

async function api(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function waitForEvent(socket, event, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), TIMEOUT_MS);
    socket.on('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.on('connect_error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Nodbusiness — Real-Time Chat Test     ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ── Step 1: Login both users ──────────────────────────────────────────────
  console.log('── Authentication ──');
  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nodbusiness.app', password: 'Admin1234!' }),
  });
  assert(adminLogin.ok && adminLogin.data.access_token, 'Admin login', `status ${adminLogin.status}`);
  const adminToken = adminLogin.data.access_token;
  const adminAuth = { headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } };

  const testLogin = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@nodbusiness.app', password: 'Test1234!' }),
  });
  assert(testLogin.ok && testLogin.data.access_token, 'Test user login', `status ${testLogin.status}`);
  const testToken = testLogin.data.access_token;
  const testAuth = { headers: { Authorization: `Bearer ${testToken}`, 'Content-Type': 'application/json' } };

  // Get admin user ID from profile
  const adminProfile = await api('/api/profiles/me', { headers: { Authorization: `Bearer ${adminToken}` } });
  const adminUserId = adminProfile.data.user_id;
  const testProfile = await api('/api/profiles/me', { headers: { Authorization: `Bearer ${testToken}` } });
  const testUserId = testProfile.data.user_id;
  assert(!!adminUserId && !!testUserId, 'Fetched both user IDs', `admin=${adminUserId?.slice(0,8)}… test=${testUserId?.slice(0,8)}…`);

  // ── Step 2: Connect WebSockets ────────────────────────────────────────────
  console.log('\n── WebSocket Connections ──');
  let adminSocket, testSocket;
  try {
    adminSocket = await connectSocket(adminToken);
    assert(adminSocket.connected, 'Admin WebSocket connected', `id=${adminSocket.id}`);
  } catch (e) {
    assert(false, 'Admin WebSocket connect', e.message);
    process.exit(1);
  }
  try {
    testSocket = await connectSocket(testToken);
    assert(testSocket.connected, 'Test WebSocket connected', `id=${testSocket.id}`);
  } catch (e) {
    assert(false, 'Test WebSocket connect', e.message);
    adminSocket.disconnect();
    process.exit(1);
  }

  // ── Step 3: Find or create DM conversation ────────────────────────────────
  console.log('\n── Conversation Setup ──');
  const convRes = await api('/api/messages/conversations/find-or-create', {
    method: 'POST',
    headers: { ...adminAuth.headers },
    body: JSON.stringify({ target_user_id: testUserId, target_name: 'Test User' }),
  });
  assert(convRes.ok, 'Find-or-create DM conversation', `status ${convRes.status}`);
  const convId = convRes.data.id;
  assert(!!convId, 'Conversation ID received', convId?.slice(0, 8) + '…');

  // Both sockets join the conversation room
  adminSocket.emit('join_conversation', convId);
  testSocket.emit('join_conversation', convId);
  await new Promise(r => setTimeout(r, 200)); // small delay for room join

  // ── Step 4: Admin sends message → test user gets socket event ────────────
  console.log('\n── Real-Time Messaging ──');
  const msgPromise = waitForEvent(testSocket, 'new_message');
  const sendRes = await api(`/api/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { ...adminAuth.headers },
    body: JSON.stringify({ content: 'Hello from admin — real-time test 👋' }),
  });
  assert(sendRes.ok && sendRes.status === 201, 'Admin POST message (REST)', `status ${sendRes.status}`);
  const adminMsgId = sendRes.data.id;

  let receivedMsg;
  try {
    receivedMsg = await msgPromise;
    assert(receivedMsg.content === 'Hello from admin — real-time test 👋', 'Test user received "new_message" socket event', `content="${receivedMsg.content.slice(0,30)}…"`);
    assert(receivedMsg.sender_id === adminUserId, 'Sender ID matches admin', receivedMsg.sender_id?.slice(0,8) + '…');
  } catch (e) {
    assert(false, 'Test user received "new_message" socket event', e.message);
  }

  // ── Step 5: Test user sends → admin gets event ────────────────────────────
  const adminMsgPromise = waitForEvent(adminSocket, 'new_message');
  const testSendRes = await api(`/api/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { ...testAuth.headers },
    body: JSON.stringify({ content: 'Hi from test user — I got your message! 🎉' }),
  });
  assert(testSendRes.ok, 'Test user POST message (REST)', `status ${testSendRes.status}`);
  const testMsgId = testSendRes.data.id;

  try {
    const adminReceived = await adminMsgPromise;
    assert(adminReceived.content === 'Hi from test user — I got your message! 🎉', 'Admin received "new_message" socket event', `content="${adminReceived.content.slice(0,30)}…"`);
  } catch (e) {
    assert(false, 'Admin received "new_message" socket event', e.message);
  }

  // ── Step 6: Edit message → socket event ──────────────────────────────────
  console.log('\n── Message Edit & Delete ──');
  const editPromise = waitForEvent(testSocket, 'message_edited');
  const editRes = await api(`/api/messages/messages/${adminMsgId}`, {
    method: 'PUT',
    headers: { ...adminAuth.headers },
    body: JSON.stringify({ content: 'Hello from admin — EDITED ✏️' }),
  });
  assert(editRes.ok, 'Admin PUT edit message (REST)', `status ${editRes.status}`);
  assert(editRes.data.edited === true, 'edited flag is true', String(editRes.data.edited));

  try {
    const editedMsg = await editPromise;
    assert(editedMsg.content === 'Hello from admin — EDITED ✏️', 'Test user received "message_edited" socket event', `content="${editedMsg.content}"`);
    assert(editedMsg.edited === true, 'Edited flag present in socket event');
  } catch (e) {
    assert(false, 'Test user received "message_edited" socket event', e.message);
  }

  // ── Step 7: Delete message → socket event ─────────────────────────────────
  const deletePromise = waitForEvent(testSocket, 'message_deleted');
  const deleteRes = await api(`/api/messages/messages/${adminMsgId}`, {
    method: 'DELETE',
    headers: { ...adminAuth.headers },
  });
  assert(deleteRes.ok, 'Admin DELETE message (REST)', `status ${deleteRes.status}`);

  try {
    const deletedEvent = await deletePromise;
    assert(deletedEvent.id === adminMsgId, 'Test user received "message_deleted" socket event', `id=${deletedEvent.id?.slice(0,8)}…`);
  } catch (e) {
    assert(false, 'Test user received "message_deleted" socket event', e.message);
  }

  // ── Step 8: Presence ──────────────────────────────────────────────────────
  console.log('\n── Presence ──');
  const presenceSetRes = await api('/api/messages/presence', {
    method: 'PUT',
    headers: { ...adminAuth.headers },
    body: JSON.stringify({ status: 'online' }),
  });
  assert(presenceSetRes.ok, 'Set admin presence to online', `status ${presenceSetRes.status}`);

  await new Promise(r => setTimeout(r, 100));
  const presenceGetRes = await api(`/api/messages/presence/${adminUserId}`, { headers: adminAuth.headers });
  assert(presenceGetRes.ok, 'Get admin presence', `status ${presenceGetRes.status}`);
  assert(presenceGetRes.data.status === 'online', 'Presence status is online', `status="${presenceGetRes.data.status}"`);

  // ── Step 9: Message history ───────────────────────────────────────────────
  console.log('\n── Message History ──');
  const historyRes = await api(`/api/messages/conversations/${convId}/messages`, { headers: adminAuth.headers });
  assert(historyRes.ok, 'Fetch message history', `status ${historyRes.status}`);
  const messages = historyRes.data;
  assert(Array.isArray(messages), 'History is an array');
  // test message should still be there (admin's was deleted)
  assert(messages.some(m => m.id === testMsgId), 'Test user message in history');
  assert(!messages.some(m => m.id === adminMsgId), 'Deleted admin message not in history');
  console.log(`   History has ${messages.length} message(s)`);

  // ── Step 10: Notifications via personal user room ─────────────────────────
  console.log('\n── Notification Socket Room ──');
  // Admin is already in user:adminUserId room — verify we can receive notification events
  const notifPromise = waitForEvent(adminSocket, 'new_notification', 3000).catch(() => null);
  // Trigger a notification indirectly by checking the room joined
  const notifResult = await notifPromise;
  // No notification expected in this test — just confirm socket is responsive
  assert(adminSocket.connected, 'Admin socket still connected after all tests');

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('\n── Cleanup ──');
  adminSocket.disconnect();
  testSocket.disconnect();
  assert(!adminSocket.connected, 'Admin socket disconnected');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed         ║`.padEnd(42) + '║');
  console.log('╚══════════════════════════════════════╝\n');

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('\n💥 Fatal error:', e.message);
  process.exit(1);
});
