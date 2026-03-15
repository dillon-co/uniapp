# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy workspace config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy all package.json files for pnpm install
COPY packages/shared/package.json ./packages/shared/
COPY packages/edl/package.json ./packages/edl/
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY packages/agents/package.json ./packages/agents/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build
RUN pnpm --filter @uniapp/api build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable

# Only production dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/edl/package.json ./packages/edl/
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY packages/agents/package.json ./packages/agents/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/edl/dist ./packages/edl/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/packages/agents/dist ./packages/agents/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Non-root user
RUN addgroup -S uniapp && adduser -S uniapp -G uniapp
USER uniapp

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/server.js"]
