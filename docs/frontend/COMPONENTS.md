# Halehame — Frontend Component Conventions

> Standards for building components in `frontend-next/`.
> Follow these so any developer can read, contribute, and extend without asking questions.

---

## Component Standard

Every component should satisfy all of these:

- [ ] **TypeScript** — no `any`, no `@ts-nocheck` unless absolutely unavoidable and documented
- [ ] **Accessible** — keyboard navigable, ARIA labels on interactive elements, color contrast AA minimum
- [ ] **Responsive** — works on mobile (375px) and desktop (1440px)
- [ ] **Server/Client aware** — Server Component by default; add `'use client'` only when needed
- [ ] **Documented** — a JSDoc comment on complex props or non-obvious behavior

---

## File Structure

```
components/
├── layout/
│   └── AppLayout.tsx        ← Main authenticated layout (sidebar, header, socket)
├── feed/                    ← Post cards, feed list
├── product/                 ← Product cards, product form
├── profile/                 ← Profile header, avatar, ticker
├── showroom/                ← Showroom builder, section editor
├── checkout/                ← Cart, checkout form, order summary
├── messaging/               ← Conversation list, message bubbles
├── map/                     ← Leaflet map wrapper, pin clusters, ProfilePeek
├── tasks/                   ← Task cards, bid form, task calendar
├── analytics/               ← Charts, stats cards
├── settings/                ← Profile edit, password change
├── ui/                      ← shadcn/ui components (Button, Input, Dialog…)
└── [SharedComponents].tsx   ← AiAssistant, PushPermissionBanner, ProtectedRoute
```

---

## When to Use `'use client'`

Add `'use client'` at the top only when the component:
- Uses React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Uses browser APIs (`window`, `document`, `localStorage`)
- Handles user events (`onClick`, `onChange`)
- Uses third-party client-only libraries (Leaflet, Recharts, Socket.IO)

If a component only renders static markup or fetches data via server functions — keep it a Server Component.

---

## State Management Patterns

| State type | Where it lives | How to access |
|---|---|---|
| Auth (user, isAuthenticated) | `AuthContext` | `useAuth()` |
| Cart | `CartContext` | `useCart()` |
| Server data (products, posts, etc.) | TanStack Query | `useQuery`, `useMutation` |
| UI state (modal open, tab active) | Local `useState` | Keep it local |
| Theme | `next-themes` | `useTheme()` |
| URL state (search, filters) | Next.js `useSearchParams` | `useSearchParams()` |

Never put server data in React context. Use TanStack Query for anything fetched from the API.

---

## Data Fetching Pattern

```tsx
// In a Server Component — preferred for initial page data
async function ProductPage({ params }) {
  const product = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${params.id}`)
  return <ProductDetail product={product} />
}

// In a Client Component — for dynamic/user-specific data
'use client'
function MyOrders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => entities.Order.filter({ buyer_id: user.id }),
  })
  if (isLoading) return <Skeleton />
  return <OrderList orders={orders} />
}
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `ProductCard.tsx` |
| Page files | `page.tsx` (App Router) | `app/(app)/marketplace/page.tsx` |
| Hook files | camelCase prefixed `use-` | `use-debounce.ts` |
| Context files | PascalCase + Context suffix | `AuthContext.tsx` |
| Utility files | camelCase | `generateInvoice.ts` |
| CSS classes | Tailwind utilities only | No custom CSS unless truly necessary |

---

## Accessibility Checklist

Before marking a component done:

- [ ] Buttons have descriptive `aria-label` if icon-only (e.g., `aria-label="Open cart"`)
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative images)
- [ ] Form inputs have associated `<label>` elements
- [ ] Error messages are associated with their input via `aria-describedby`
- [ ] Modals/dialogs trap focus and close on Escape key (shadcn/ui Dialog handles this)
- [ ] Color is not the only indicator of state (also use text or icon)
- [ ] Interactive elements are reachable by Tab key

---

## Common Patterns

### Loading state
```tsx
if (isLoading) return (
  <div className="space-y-3">
    {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
  </div>
)
```

### Empty state
```tsx
if (!items?.length) return (
  <div className="text-center py-16 text-muted-foreground">
    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p className="font-medium">No products yet</p>
    <p className="text-sm">Be the first to list a product</p>
  </div>
)
```

### Error state
```tsx
if (error) return (
  <div className="text-center py-8 text-destructive">
    <p>Failed to load. <button onClick={() => refetch()}>Try again</button></p>
  </div>
)
```

### Toast notifications
```tsx
import { toast } from 'sonner'

// Success
toast.success('Product created!')

// Error
toast.error('Failed to save. Please try again.')

// With action
toast('Order placed', {
  action: { label: 'View', onClick: () => router.push('/orders') }
})
```
