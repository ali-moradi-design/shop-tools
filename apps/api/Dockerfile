# Tools shop API. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t shop-tools-api .
FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@12.15.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
# the Prisma client is generated at install time
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @st/api
COPY apps/api apps/api
RUN pnpm --filter @st/api build \
 && pnpm --filter @st/api deploy --prod --legacy /out \
 && cp -r apps/api/dist /out/dist

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
# Prisma's engines need OpenSSL
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /out ./
# `pnpm deploy` reinstalls the packages without the generated Prisma client; generate it here,
# where OpenSSL is present, so the engine matches the runtime
RUN node_modules/.bin/prisma generate \
 && mkdir -p uploads/products && chown -R node:node uploads
# never run as root
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
