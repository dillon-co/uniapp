# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/edl/package.json ./packages/edl/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/edl/ ./packages/edl/
COPY packages/ui/ ./packages/ui/
COPY apps/web/ ./apps/web/

ARG NEXT_PUBLIC_API_URL=https://api.uniapp.dev
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @uniapp/web build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/edl/package.json ./packages/edl/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

RUN addgroup -S uniapp && adduser -S uniapp -G uniapp
USER uniapp

EXPOSE 3000
ENV NODE_ENV=production PORT=3000

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start"]
