# ── Stage 1: Dependencies + Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 expressjs

# Copy compiled JS from build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy JS migration scripts and seed (not compiled by tsc)
COPY --from=builder /app/db ./db

# Create uploads directory (used in dev; Supabase/R2 used in prod)
RUN mkdir -p uploads && chown expressjs:nodejs uploads

USER expressjs

EXPOSE 10000
ENV NODE_ENV=production
ENV PORT=10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:10000/health || exit 1

CMD ["node", "dist/index.js"]
