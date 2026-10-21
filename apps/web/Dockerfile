# Welt & Grain storefront. Build from the repository root. Prerendering reads the
# catalog, so the API must be reachable while building:
#   docker build -f apps/web/Dockerfile --network host \
#     --build-arg API_URL=http://127.0.0.1:4000 --build-arg SITE_URL=https://shop.example.com \
#     -t shop-tools-web .
FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @st/web
COPY apps/web apps/web
ARG API_URL=http://127.0.0.1:4000
ARG SITE_URL=http://localhost:3000
ENV API_URL=$API_URL NEXT_PUBLIC_SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @st/web build

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
