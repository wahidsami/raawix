FROM node:20-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/scanner ./apps/scanner

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @raawi-x/scanner db:generate
RUN pnpm --filter @raawi-x/scanner build

WORKDIR /app/apps/scanner
EXPOSE 3001

CMD ["sh", "-c", "pnpm db:migrate:deploy && node dist/index.js"]
