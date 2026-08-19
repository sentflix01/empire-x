# Nodbusiness — Frontend State Management

> How state is managed in `frontend-next/`. Read this before adding new state.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| UI | User Interface |
| API | Application Programming Interface |
| URL | Uniform Resource Locator |
| JWT | JSON Web Token |
| SPA | Single Page Application |
| SSR | Server-Side Rendering |
| OTP | One-Time Password |
| MAU | Monthly Active Users |
| PII | Personally Identifiable Information |

---

## State Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  URL State              next/navigation useSearchParams         │
│  (filters, search, tab)                                         │
├─────────────────────────────────────────────────────────────────┤
│  Server State           TanStack Query (useQuery, useMutation)  │
│  (products, posts,      Fetched from backend API               │
│   orders, profiles)     Cached, revalidated automatically       │
├─────────────────────────────────────────────────────────────────┤
│  Global Client State    React Context                           │
│  (auth user, cart)      AuthContext, CartContext                │
├─────────────────────────────────────────────────────────────────┤
│  Local UI State         useState / useReducer                   │
│  (modal open, form      Keep it in the component               │
│   values, tab index)                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Auth State (`AuthContext`)

**Location:** `frontend-next/lib/AuthContext.tsx`

```tsx
const { user, isAuthenticated, authChecked, logout, refreshUser } = useAuth()
```

| Field | Type | Description |
|---|---|---|
| `user` | `Record<string,unknown> \| null` | Current user object from `/api/auth/me` |
| `isAuthenticated` | `boolean` | True when user is loaded and valid |
| `authChecked` | `boolean` | True once auth check completes (success or failure) |
| `isLoadingAuth` | `boolean` | True while `/api/auth/me` is in flight |
| `logout(redirectTo?)` | `function` | Clears token and redirects |
| `refreshUser()` | `function` | Re-fetches `/api/auth/me` |

**Important:**
- Wait for `authChecked === true` before making auth-dependent decisions
- `AppLayout` redirects to `/login` when `authChecked && !isAuthenticated`
- Never call `auth.me()` directly in components — always use `useAuth()`

---

## Cart State (`CartContext`)

**Location:** `frontend-next/lib/CartContext.tsx`

```tsx
const { cart, addItem, removeItem, updateQty, clearCart, loading } = useCart()
```

| Field | Type | Description |
|---|---|---|
| `cart.items` | `Array` | Cart line items with product details |
| `cart.total` | `number` | Total price |
| `cart.count` | `number` | Number of items (shown in header badge) |
| `loading` | `boolean` | True while cart API call is in flight |

**Important:**
- `CartProvider` is inside `AuthProvider` — cart re-fetches automatically after auth resolves
- Use `addItem(productId, quantity)` for add-to-cart — it handles the API call and refresh

---

## Server State (TanStack Query)

**Location:** `frontend-next/lib/query-client.ts`

All API data should be fetched with `useQuery` or `useMutation`. Never store API responses in `useState` directly.

```tsx
// Fetch a list
const { data: products, isLoading } = useQuery({
  queryKey: ['products', { seller_id: user.id }],
  queryFn: () => entities.Product.filter({ seller_id: user.id }),
  enabled: !!user,
})

// Mutate
const createProduct = useMutation({
  mutationFn: (data) => entities.Product.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    toast.success('Product created!')
  },
  onError: (err) => toast.error(err.message || 'Failed to create product'),
})
```

**Query key conventions:**

| Data | Query key |
|---|---|
| All products | `['products']` |
| User's products | `['products', { seller_id: userId }]` |
| Single product | `['products', productId]` |
| All orders | `['orders']` |
| User's orders | `['orders', { buyer_id: userId }]` |
| Notifications | `['notifications']` |
| Cart | Managed by `CartContext` directly |

---

## Real-Time Updates (Socket.IO)

**Location:** `frontend-next/lib/socket.ts`

Socket.IO runs inside `AppLayout` and updates state in real-time:

```tsx
// AppLayout.tsx
connectSocket()
const s = getSocket()
s.on('new_notification', (notif) => {
  setUnreadCount(c => c + 1)
  toast(notif.title, { ... })
})

// For messages — in the ChatRoom page
s.on('new_message', (msg) => {
  queryClient.setQueryData(['messages', conversationId], (old) => [...old, msg])
})
```

**Socket events emitted by the backend:**
- `new_notification` — sent to `user:{userId}` room
- `new_message` — sent to `conv:{conversationId}` room

---

## What NOT to Do

```tsx
// ❌ Don't fetch in useEffect + useState
const [products, setProducts] = useState([])
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setProducts)
}, [])

// ✅ Use TanStack Query instead
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: () => entities.Product.list(),
})

// ❌ Don't call auth.me() directly in components
const [user, setUser] = useState(null)
useEffect(() => { auth.me().then(setUser) }, [])

// ✅ Use useAuth()
const { user } = useAuth()

// ❌ Don't store server data in context
const [allProducts, setAllProducts] = useState([])
// Put this in TanStack Query, not context

// ❌ Don't use Redux for this project
// TanStack Query + Context is sufficient and much simpler
```
