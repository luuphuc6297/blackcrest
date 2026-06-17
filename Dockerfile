# Blackcrest — production image (Next.js standalone, blueprint §5).
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate && pnpm build

# ── migrator ──────────────────────────────────────────────────────────────────
# One-shot image for the compose `migrate` service: runs `prisma migrate deploy`
# on release. Carries the FULL node_modules (Prisma CLI + engines) that the lean
# runner deliberately omits — so migrations run in-container without the
# pnpm symlink breakage of copying just `node_modules/prisma` into the runner.
FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json pnpm-workspace.yaml ./
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Watermark fonts are read from disk at runtime (lib/watermark) — must ship them.
COPY --from=builder /app/assets ./assets
# Prisma client + query engine ship via the Next standalone trace
# (.next/standalone/node_modules); keep the schema for reference.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

USER nextjs
EXPOSE 3000

# Liveness/readiness: app must answer /api/health with 200 (blueprint §5) — drives
# compose healthcheck + blue/green cutover.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
