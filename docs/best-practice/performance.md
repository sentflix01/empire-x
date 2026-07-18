# Performance Best Practices

This guide focuses on improving performance across frontend, backend, and network layers.

## Goals

- Reduce frontend bundle size and runtime cost
- Reduce backend response time
- Minimize unnecessary data transfers
- Make performance measurable and repeatable

## 1. Frontend performance

### Code splitting and lazy loading
- Use dynamic imports for heavy components
- Keep landing page and main routes small
- Avoid importing large libraries globally

### React performance
- Use memoization for expensive computations (`useMemo`, `useCallback`)
- Avoid unnecessary re-renders
- Use primitive selectors with Zustand
- Keep component trees shallow where possible

### Asset optimization
- Use `next/image` for optimized images
- Compress static assets and use a CDN for production
- Use SVGs for icons and simple vector assets

### Network performance
- Minimize bundle size by removing unused dependencies
- Use `next/font` for fonts or self-hosted font bundles
- Avoid large payloads from APIs

## 2. Backend performance

### Query optimization
- Profile slow SQL queries
- Add indexes for search and cart queries
- Use pagination and limits for list endpoints

### Caching
- Cache frequently used responses or computed data in Redis
- Use HTTP caching headers where appropriate
- Cache search results or business lookups for repeated queries

### Efficient APIs
- Return only needed fields in API responses
- Avoid deeply nested objects if not necessary
- Use compact request/response formats

## 3. Map/search-specific performance

- Use server-side filtering and limit search radius
- Don’t load all products at once on the map
- Only request map markers after user search input
- Use lightweight marker rendering and clustering

## 4. Verification

- Run Lighthouse / Web Vitals on critical pages
- Measure TTFB and JS bundle size
- Use React Profiler for the map and cart flows
- Add regression checks for critical page render time
