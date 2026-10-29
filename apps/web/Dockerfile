# Tools shop storefront. Build from the repository root:
#   docker build -f apps/web/Dockerfile --build-arg SITE_URL=https://shop.example.com -t shop-tools-web .
# Pages are rendered per request, so the API is not needed at build time; API_URL is
# read at runtime (set it in the compose file).
FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.15.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @st/web
COPY apps/web apps/web
ARG SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @st/web build

FROM node:24-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
