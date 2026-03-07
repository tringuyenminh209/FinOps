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

COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY tsconfig.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN cd packages/shared && pnpm build 2>/dev/null || true
RUN cd packages/frontend && pnpm build

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
# shared package: symlink in node_modules points here at runtime
COPY --from=builder --chown=finops:finops /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=finops:finops /app/packages/shared/package.json ./packages/shared/package.json

USER finops
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
