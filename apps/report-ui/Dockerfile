FROM node:20-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/report-ui ./apps/report-ui

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @raawi-x/report-ui build

FROM nginx:1.27-alpine
COPY apps/report-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/report-ui/dist /usr/share/nginx/html

EXPOSE 80
