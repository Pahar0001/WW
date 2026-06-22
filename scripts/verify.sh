#!/usr/bin/env bash
# Static + runtime verification helper for the Vela monorepo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Validating JSON config files…"
for f in backend/package.json backend/tsconfig.json backend/nest-cli.json \
         frontend/package.json frontend/tsconfig.json frontend/.eslintrc.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "  ✓ $f"
done

echo "▶ Checking required files…"
for f in docker-compose.yml backend/prisma/schema.prisma backend/prisma/seed.ts \
         frontend/next.config.js README.md; do
  [ -f "$f" ] && echo "  ✓ $f" || { echo "  ✗ missing $f"; exit 1; }
done

echo "▶ (Optional) install + build — requires Node 20+ and a database:"
echo "    cd backend  && npm install && npx prisma generate && npm run build && npm test"
echo "    cd frontend && npm install && npm run build"
echo "▶ Or run everything:  docker compose up --build"
echo "✓ Static verification passed."
