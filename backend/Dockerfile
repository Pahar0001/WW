# Vela API — multi-stage build.
# Debian-slim (not Alpine): Prisma needs a glibc + OpenSSL it can detect.
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.seed.json nest-cli.json ./
COPY src ./src
RUN npm run build          # -> dist/          (the API)
RUN npm run build:seed     # -> dist-seed/      (compiled seed, no ts-node at runtime)
# Drop dev deps but keep prod deps + prisma CLI (now a dependency) + the
# already-generated client. The runner reuses this node_modules as-is.
RUN npm prune --omit=dev

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY prisma ./prisma
EXPOSE 4000
# Self-sufficient boot for cloud hosts (Render/Railway) that run the image
# directly without docker-compose: sync schema, seed (best-effort), then start.
# docker-compose overrides this with its own `command:` for local dev.
CMD ["sh", "-c", "npx prisma db push --skip-generate && (npm run seed || echo 'seed skipped') && node dist/main.js"]
