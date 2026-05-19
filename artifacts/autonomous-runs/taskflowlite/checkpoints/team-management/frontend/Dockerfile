FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false

FROM node:22-alpine AS build
WORKDIR /app
COPY . .
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
RUN pnpm install --frozen-lockfile=false --config.confirmModulesPurge=false
RUN pnpm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
