# Database

PostgreSQL 16 via Prisma. Canonical schema: `backend/prisma/schema.prisma`.

## Entity overview
```
Country ─┬─< Region ─< City ─< Place
         ├─< SeasonInsight              (monthly heatmap: weather/price/crowd)
         └─< Trip ─┬─< RouteVariant ─┬─< Day ─┬─< DayPlace >─ Place
                   │                 │        └─< TransportLeg
                   │                 └─ BudgetBreakdown ─< BudgetLine
                   ├─ TripScore (1:1)
                   └─< TripOpinion

User ─< SavedTrip   (snapshot JSON = modular-builder output)
```

## Provenance fields
Present on `Place`, `TransportLeg`, `BudgetLine`, `SeasonInsight`:
- `source` — origin label (e.g. `wikidata`, `google-maps`, `manual-editor`)
- `sourceUrl` — link when available
- `dataStatus` — `VERIFIED` | `ESTIMATED` | `PENDING`
- `trustLevel` — 1 official · 2 major aggregator · 3 secondary
- `fetchedAt` — timestamp

## Key enums
- `Pace` — `CALM | BALANCED | ACTIVE` (the three variant flavors)
- `TripStatus` — `DRAFT | PUBLISHED | HIDDEN` (CMS visibility)
- `TransportMode` — `WALK, HIGH_SPEED_RAIL, TRAIN, FLIGHT, CAR, BUS, CABLE_CAR, FERRY`
- `BudgetCategory` — `FLIGHTS, HOTELS, TRANSPORT, FOOD, ACTIVITIES, RESERVE`

## Migrations
The reference build syncs schema with `prisma db push` on boot. For production:
```bash
cd backend
npx prisma migrate dev --name init   # generate a migration
npx prisma migrate deploy            # apply in CI/prod
```
Then switch the `backend` service `command` in `docker-compose.yml` from
`prisma db push` to `prisma migrate deploy`.

## Seed
`backend/prisma/seed.ts` inserts the China Dream Trip with three variants. It is
idempotent (upserts) and enforces the Real Data Policy — prices, distances and
travel times are `PENDING` (null), not invented.
