# Architecture

Vela is a modular monorepo with a clear seam between a presentation layer (Next.js)
and a domain/API layer (NestJS + Prisma over PostgreSQL).

```
┌──────────────┐      HTTP/JSON      ┌──────────────┐      SQL      ┌────────────┐
│  Next.js web │ ──────────────────▶ │  NestJS API  │ ───────────▶ │ PostgreSQL │
│  (frontend)  │   /api/*            │  (backend)   │   Prisma     │            │
└──────────────┘                     └──────────────┘               └────────────┘
        │                                   │
   Google Maps JS                    Adapter layer ──▶ external providers
   (client, keyed)                   (Booking, Agoda, Trip.com, …)
```

## Principles
- **Clean separation / DDD-lite.** The domain (trips, variants, days, places,
  budgets, scores, provenance) lives in the Prisma schema and is the single source
  of truth. Modules are organised by domain concern, not by technical layer.
- **SOLID adapters.** Every external provider implements one `TravelAdapter`
  interface (`backend/src/modules/integrations`). Adding a provider = one class.
- **Provenance everywhere.** Externally-sourced fields carry
  `source / sourceUrl / dataStatus / trustLevel / fetchedAt`. The UI renders the
  status; unknowns are `PENDING`, never invented (see README → Real Data Policy).
- **Pure domain logic is testable.** Scoring/load heuristics live in
  `backend/src/common/scoring.ts` as pure functions with unit tests.
- **Graceful degradation.** No API key → map fallback; API down → empty states.

## Backend modules
| Module | Responsibility |
|--------|----------------|
| `prisma` | Database access (global provider) |
| `health` | Liveness + DB check (`GET /api/health`) |
| `trips` | List/detail of curated trips with full graph |
| `routes` | Live load analysis + relaxation verdict per variant |
| `recommendations` | AI-planner contract (rules now, LLM agent later) |
| `analytics` | First-party event ingestion + summary |
| `integrations` | Adapter registry + best-value ranking |

## Frontend structure
| Path | Responsibility |
|------|----------------|
| `app/page.tsx` | Cinematic landing + Dream Trips grid |
| `app/trips/[slug]` | Trip detail: scores, day map, budget, opinions |
| `components/cursor` | Signature magnetic cursor |
| `components/canvas` | Generative flow-field background |
| `components/map` | Google Maps day view + fallback |
| `components/trip` | Pace/day switching, budget panel |
| `lib/api.ts` | Typed API client |

## Decision log (multi-persona analysis)
Each major decision was weighed from five viewpoints (supporter, critic, investor,
competitor, product owner). Summary:

- **Monorepo + REST over GraphQL.** *Supporter:* fastest to a working product;
  *Critic:* REST can over/under-fetch; *Investor:* lower hiring/onboarding cost;
  *Competitor:* parity with most travel APIs; *Owner:* REST + a fat `getTrip`
  endpoint is enough today, GraphQL can come with mobile. **→ REST.**
- **Provenance as first-class schema fields, not an afterthought.** Unanimous: it is
  the product's differentiator and legally protective. **→ Built into the model.**
- **Adapters report `NOT_CONFIGURED` instead of mock data.** *Critic:* demos look
  emptier; *Owner/Investor:* honesty is the brand and avoids ToS/legal risk.
  **→ No mock offers, ever.**
- **Canvas 2D flow-field over Three.js for the background.** *Supporter:* hits the
  Lighthouse/perf budget; *Critic:* less "wow" than WebGL; *Owner:* perf + battery
  win for a content site. **→ Canvas now, Three.js reserved for a future 3D globe.**

See `docs/INTEGRATIONS.md` for the future AI-agent and provider roadmap.
