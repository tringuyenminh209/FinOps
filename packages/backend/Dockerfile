# ── Backend: Multi-stage production build ──
# Node 20 Alpine for minimal image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm install --frozen-lockfile --filter @finops/backend --filter @finops/shared

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

RUN pnpm --filter @finops/shared build 2>/dev/null || true
RUN pnpm --filter @finops/backend build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 finops && \
  adduser --system --uid 1001 finops

COPY --from=builder --chown=finops:finops /app/node_modules ./node_modules
COPY --from=builder --chown=finops:finops /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=finops:finops /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=builder --chown=finops:finops /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=finops:finops /app/packages/shared/package.json ./packages/shared/package.json
USER finops
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "packages/backend/dist/index.js"]
