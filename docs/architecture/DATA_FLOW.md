# Halehame — Data Flow Diagrams

> How data moves through the system for key user journeys.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| DB | Database |
| OTP | One-Time Password |
| PII | Personally Identifiable Information |
| CDN | Content Delivery Network |
| WS | WebSocket |
| GPS | Global Positioning System |
| UUID | Universally Unique Identifier |
| TTL | Time to Live |
| HMAC | Hash-based Message Authentication Code |

---

## 1. Authentication Flow

```
User enters email/password
         │
         ▼
POST /api/auth/login
         │
         ├─ Hash password with bcrypt.compare()
         │
         ├─ Check is_banned = false
         │
         ├─ Generate JWT (RS256, 7d expiry)
         │   payload: { sub: userId, email, role, jti }
         │
         ├─ Issue HttpOnly refresh token (planned)
         │
         └─ Return { access_token, user }
                  │
                  ▼
         Frontend: storeToken(access_token)
         → localStorage.setItem('access_token')
         → document.cookie = 'access_token=...'
                  │
                  ▼
         useAuth() hook resolves
         → AuthContext provides { user, isAuthenticated }
         → AppLayout renders authenticated view
```

---

## 2. Order Payment Flow (Stripe)

```
Buyer clicks "Pay with Card"
         │
         ▼
PurchaseModal / Cart.tsx
         │
POST /api/orders/checkout/session
         │
         ├─ Load products from DB (prices NEVER from client)
         ├─ Validate stock
         ├─ Validate coupon (if any)
         ├─ Create pending order(s) in DB
         ├─ Create Stripe Checkout Session
         └─ Return { url: stripe_checkout_url }
                  │
                  ▼
         window.location.href = stripe_url
         → User on Stripe hosted checkout
         → User enters card details
         → Stripe processes payment
                  │
                  ▼
         Stripe redirect: /orders/success?session_id=xxx
                  │
                  ▼
         Stripe sends webhook POST /api/orders/webhook
         → constructEvent() verifies signature
         → handleStripeEvent() processes:
              ├─ UPDATE orders SET status = 'paid'
              ├─ UPDATE products SET stock -= quantity
              ├─ collectCommission()
              ├─ sendOrderConfirmation() to buyer
              ├─ emitNotification() to seller
              └─ sendPushToUser() to buyer + seller
```

---

## 3. Real-Time Message Flow

```
User A types message in ChatRoom.tsx
         │
         ▼
handleSend() → optimistic UI update
         │
POST /api/messages/conversations/:convId/messages
         │
         ├─ Verify participant
         ├─ Check block status
         ├─ INSERT message to DB
         ├─ UPDATE conversations SET last_message
         ├─ emitNewMessage(convId, message)
         │         │
         │         ▼
         │   socket.to(`conv:${convId}`).emit('new_message', msg)
         │         │
         │         ▼
         │   User B's ChatRoom receives 'new_message'
         │   → setMessages(prev => [...prev, msg])
         │   → bottomRef.current.scrollIntoView()
         │
         ├─ For each recipient:
         │   INSERT notification (type: 'message')
         │   emitNotification(recipientId, notif)
         │   sendPushToUser(recipientId, ...)
         │
         └─ Return 201 { message }
                  │
                  ▼
         Temp message replaced with server message
         (tempId swapped for real UUID)
```

---

## 4. Feed Loading Flow

```
User opens Home page
         │
         ▼
loadPosts(reset=true) called
         │
GET /api/posts?feed=true&limit=15&offset=0
         │
         ├─ CTE query:
         │   - 50% recent posts (< 3 days)
         │   - 30% popular posts (like_count > 5)
         │   - 20% random posts
         │   - DISTINCT ON (id) deduplication
         │   - ORDER BY feed_rank ASC, created_at DESC
         │
         └─ Return 15 posts
                  │
                  ▼
         setPosts(data)
         setLoading(false)
         → PostCard renders for each post
                  │
         (user scrolls to sentinel)
                  │
                  ▼
IntersectionObserver fires → loadMore()
         │
GET /api/posts?feed=true&limit=15&offset=15
         │
         └─ Append to posts (dedup by id)
```

---

## 5. Notification Delivery Flow

```
Any server-side event (message, like, comment, order)
         │
         ├─ INSERT INTO notifications
         │
         ├─ emitNotification(userId, notif)
         │       │
         │       ▼
         │   socket.to(`user:${userId}`).emit('new_notification', notif)
         │       │
         │       ▼
         │   AppLayout's socket listener:
         │   if (notif.type === 'message') setUnreadMessages(c => c+1)
         │   else setUnreadCount(c => c+1)
         │   toast(notif.title, ...)
         │
         └─ sendPushToUser(userId, title, body, link)
                 │
                 ▼
         Push subscription fetched from DB
         webpush.sendNotification(subscription, payload)
                 │
                 ▼
         Service worker receives push
         → showNotification() in sw.js
         → User sees notification on their device
           (even when app is closed)
```

---

## 6. File Upload Flow

```
User selects image in upload component
         │
         ▼
POST /api/upload (multipart/form-data)
         │
         ├─ Validate MIME type (image/jpeg, image/png, etc.)
         ├─ Validate size (< 10MB)
         │
         ├─ If R2_BUCKET_NAME configured:
         │   Upload to Cloudflare R2
         │   Return { url: 'https://pub-xxx.r2.dev/path' }
         │
         └─ If no R2:
             Save to local disk /uploads/
             Return { url: '/uploads/filename.jpg' }
                  │
                  ▼
         Frontend stores URL in form state
         URL saved to DB on form submit
```

---

## 7. Search Flow

```
User types in search box (debounced 300ms)
         │
         ▼
GET /api/search?q=coffee&type=all&sort=relevance
         │
         ├─ Validate: q.length >= 2
         │
         ├─ Parse: lat/lon (if provided), validate ranges
         │
         ├─ Parallel DB queries:
         │   ├─ Users: ILIKE on display_name
         │   ├─ Products: ILIKE on title/description + optional geo filter
         │   ├─ Showrooms: ILIKE on title/description
         │   ├─ Tasks: ILIKE on title
         │   ├─ Posts: ILIKE on content
         │   ├─ Jobs: ILIKE on title/company
         │   └─ Events: ILIKE on title/description
         │
         ├─ Attach distance_km (Haversine) if coords provided
         │
         └─ Return { users: [], products: [], showrooms: [], ... }
                  │
                  ▼
         Search.tsx renders results by active tab
         "All" tab shows all types
         Individual tabs filter by type
```

---

## 8. Socket.IO Room Architecture

```
Connection established:
├─ JWT verified in socket middleware
├─ socket.join(`user:${userId}`)    ← personal room (notifications)
└─ socket.user = { id, email, role }

On 'join_conversation' event:
├─ Verify user is participant
└─ socket.join(`conv:${conversationId}`)   ← conversation room

Room usage:
├─ `user:${userId}`:
│   ← emitNotification() — personal notifications
│   ← order/payment events
│   ← direct messages
│
└─ `conv:${conversationId}`:
    ← emitNewMessage() — chat messages
    ← emitMessageEdited() — edit events
    ← emitMessageDeleted() — delete events
    ← typing indicators
```
