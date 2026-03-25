# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/report-ui ./apps/report-ui

# Ensure devDependencies are installed for build (override Coolify build-time NODE_ENV=production)
ENV NODE_ENV=development

# Baked into the static bundle at build time (set in Coolify as build args or build env)
ARG VITE_API_URL=http://localhost:3001
ARG VITE_API_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_KEY=$VITE_API_KEY

RUN --mount=type=cache,id=pnpm-raawix-report-ui,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
    && pnpm install --frozen-lockfile
RUN pnpm --filter @raawi-x/report-ui... build

FROM nginx:1.27-alpine
COPY apps/report-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/report-ui/dist /usr/share/nginx/html

EXPOSE 80
