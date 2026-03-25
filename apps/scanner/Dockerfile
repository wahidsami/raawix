# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build

# Cache apt metadata/packages between builds (BuildKit)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/scanner ./apps/scanner

# Ensure devDependencies are installed for build (override Coolify build-time NODE_ENV=production)
ENV NODE_ENV=development

# Cache pnpm store between builds on the same host (BuildKit)
RUN --mount=type=cache,id=pnpm-raawix-scanner,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
    && pnpm install --frozen-lockfile
RUN pnpm --filter @raawi-x/scanner db:generate
RUN pnpm --filter @raawi-x/scanner... build

WORKDIR /app/apps/scanner

# Install Playwright dependencies and the Chromium browser
RUN npx playwright install --with-deps chromium

EXPOSE 3001

# Prefer IPv4 when both A and AAAA exist (common Docker/VPS IPv6 egress issues)
ENV NODE_OPTIONS=--dns-result-order=ipv4first

# Auto-resolve the specifically corrupted migration if it exists in a failed state
# Then run deploy and start
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20250205000000_add_agent_finding_and_page_agent_path || true && pnpm db:migrate:deploy && node dist/index.js"]
