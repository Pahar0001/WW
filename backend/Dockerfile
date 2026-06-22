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
RUN npm run build          # -> dist/  (the API)
RUN npm run build:seed     # -> dist-seed/seed.js  (no ts-node needed at runtime)

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev
# prisma CLI is needed only for the `db push` boot step (schema sync).
RUN npm install prisma@5.9.0
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
EXPOSE 4000
CMD ["node", "dist/main.js"]
