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

# Install PostgreSQL client for pg_dump (backup script)
RUN apk add --no-cache postgresql-client

# Copy compiled JS from build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy JS migration scripts and seed (not compiled by tsc)
COPY --from=builder /app/db ./db

# Copy JS scheduler scripts into dist so require('./scripts/...') resolves
COPY --from=builder /app/scripts ./dist/scripts

# Create uploads directory with correct ownership BEFORE switching user
RUN mkdir -p /app/uploads && chown -R expressjs:nodejs /app/uploads
RUN mkdir -p /app/dist/uploads && chown -R expressjs:nodejs /app/dist/uploads
RUN mkdir -p /app/backups && chown -R expressjs:nodejs /app/backups

USER expressjs

EXPOSE 10000
ENV NODE_ENV=production
ENV PORT=10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:10000/health || exit 1

CMD ["node", "dist/index.js"]
