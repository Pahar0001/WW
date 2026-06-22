# Vela — Premium Travel Planning Platform

> *Plan journeys worth remembering.*

Vela is a modular, AI-assisted travel-planning platform. It lets travelers browse
curated "Dream Trips", build their own itineraries, compare options, see day-by-day
routes on a map, and analyze budgets — wrapped in a cinematic, ultra-minimal interface.

The first curated trip is **"China: The Floating Mountains"** — a 14-day route built
around Zhangjiajie (the "Avatar" mountains), ancient towns, and national parks.

---

## ⚠️ Status & honesty notice

This repository is a **production-oriented foundation / reference architecture**, not a
finished commercial product. It is designed so that the hard, durable decisions (domain
model, module boundaries, integration contracts, deployment) are real and correct, and so
that the remaining work is *filling in*, not *re-architecting*.

What is real and working:
- Clean monorepo that boots with `docker compose up` (Postgres + NestJS API + Next.js web).
- A fully modeled domain (Prisma schema) for countries, trips, route variants, days, places, budgets, scores, and data-provenance.
- Backend modules with REST endpoints (trips, routes, recommendations, analytics, integrations adapters, health).
- Premium frontend shell: signature magnetic cursor, generative canvas background, the China Dream Trip page, and a budget breakdown.
- Adapter interfaces for Booking, Agoda, Trip.com, Skyscanner, 12Go, Yandex Travel, Expedia — ready for future API keys, **with no scraping and no fabricated data**.

What is intentionally NOT done (and must not be faked):
- Real prices, distances, travel times, hotel/flight costs, weather, and ratings. See **Real Data Policy** below. Seed data is marked `dataStatus: PENDING` or carries an explicit `source` — nothing is invented.
- Live third-party integrations (require your own API keys / commercial agreements).
- Full CMS UI, auth provider wiring, and exhaustive test coverage (contracts and examples are in place).

---

## Real Data Policy (non-negotiable)

Vela **never invents** prices, routes, distances, travel times, accommodation/flight
costs, place ratings, or weather. Every data point carries provenance:

| Field | Meaning |
|-------|---------|
| `source` | Where the value came from (e.g. `google-maps`, `wikidata`, `manual-editor`) |
| `sourceUrl` | Link to the origin when available |
| `dataStatus` | `VERIFIED` \| `ESTIMATED` \| `PENDING` |
| `trustLevel` | `1` official, `2` major aggregator, `3` secondary |
| `fetchedAt` | When the value was obtained |

If a value is unknown, it is stored as `PENDING` and surfaced in the UI as
"data pending" — it is **never** replaced with a guess.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion |
| Generative / art | Canvas 2D particle field (lightweight, `prefers-reduced-motion` aware) |
| Maps | Google Maps JavaScript API (key via env; graceful fallback when absent) |
| Backend | NestJS 10, TypeScript, REST, Zod-validated DTOs |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | Auth.js (NextAuth) — interface wired, provider keys via env |
| Infra | Docker + Docker Compose |

---

## Quick start

### Prerequisites
- Docker + Docker Compose **or** Node.js 20+ and a local Postgres.

### Run everything with Docker
```bash
cd Repository
cp .env.example .env        # then edit values (DB password, GOOGLE_MAPS_API_KEY, ...)
docker compose up --build
```
Services:
- Web → http://localhost:3000
- API → http://localhost:4000/api
- Postgres → localhost:5432

On first boot the API runs Prisma migrations and seeds the China Dream Trip.

### Run locally without Docker
```bash
# Terminal 1 — database (or use your own Postgres)
docker compose up db

# Terminal 2 — backend
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run start:dev

# Terminal 3 — frontend
cd frontend
npm install
npm run dev
```

---

## Repository structure

```
Repository/
├── frontend/        Next.js app (UI, cursor, generative canvas, map, trip pages)
├── backend/         NestJS API (domain modules + Prisma)
├── database/        Prisma schema, seed, ER notes
├── docs/            Architecture, DB, API, how-to guides
├── scripts/         Dev / seed / verify scripts
├── deployment/      Dockerfiles, compose overrides
├── assets/          Static brand assets (placeholders documented)
├── docker-compose.yml
└── README.md
```

> Note: the canonical Prisma schema lives in `backend/prisma/schema.prisma`.
> `database/` holds documentation and a copy for reference.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, module boundaries, decision log
- [Database](docs/DATABASE.md) — schema and ER overview
- [API](docs/API.md) — endpoints and contracts
- [Adding a new trip](docs/ADDING_ROUTES.md) — no code required
- [Google Maps setup](docs/GOOGLE_MAPS.md)
- [External integrations](docs/INTEGRATIONS.md) — adapter pattern, legal/ToS rules
- **[Деплой на GitHub + Render + Netlify (по-русски, по шагам)](docs/DEPLOY_RU.md)** ⭐
- [Netlify deploy notes (EN)](docs/DEPLOY_NETLIFY.md)

---

## License & data

Code is provided as a reference implementation. Any third-party data you connect remains
subject to that provider's Terms of Service. Vela's adapters are designed to use
**official APIs with valid keys only** — no scraping, no ToS circumvention.
