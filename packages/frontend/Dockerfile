# ── Frontend: Multi-stage Next.js standalone build ──

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/

RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm install --frozen-lockfile --filter @finops/frontend --filter @finops/shared

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY tsconfig.json ./

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time public env vars (baked into Next.js bundle)
ARG NEXT_PUBLIC_LINE_CLIENT_ID
ARG NEXT_PUBLIC_LIFF_ID
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_LINE_CLIENT_ID=$NEXT_PUBLIC_LINE_CLIENT_ID
ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN pnpm --filter @finops/shared build 2>/dev/null || true
RUN pnpm --filter @finops/frontend build

# Stage 3: Production runtime (standalone)
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 finops && \
  adduser --system --uid 1001 finops

COPY --from=builder --chown=finops:finops /app/packages/frontend/public ./public
COPY --from=builder --chown=finops:finops /app/packages/frontend/.next/standalone ./
COPY --from=builder --chown=finops:finops /app/packages/frontend/.next/static ./.next/static
# Override standalone's broken pnpm symlinks with full hoisted node_modules from builder
COPY --from=builder --chown=finops:finops /app/node_modules ./node_modules
# Place shared directly in node_modules to avoid broken workspace symlinks
COPY --from=builder --chown=finops:finops /app/packages/shared/dist ./node_modules/@finops/shared/dist
COPY --from=builder --chown=finops:finops /app/packages/shared/package.json ./node_modules/@finops/shared/package.json

USER finops
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
