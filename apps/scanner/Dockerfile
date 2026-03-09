FROM node:20-alpine AS build

RUN apk add --no-cache openssl libc6-compat ca-certificates
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/scanner ./apps/scanner

# Ensure devDependencies are installed for build
ENV NODE_ENV=development

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @raawi-x/scanner db:generate
RUN pnpm --filter @raawi-x/scanner... build

WORKDIR /app/apps/scanner
EXPOSE 3001

# Auto-resolve the specifically corrupted migration if it exists in a failed state
# Then run deploy and start
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20250205000000_add_agent_finding_and_page_agent_path || true && pnpm db:migrate:deploy && node dist/index.js"]
