# Adding a new trip (no code required)

New countries and trips are **data**, not code. Three supported paths:

## 1. Via the CMS (intended end state)
A future admin panel (see roadmap) writes the same records described below through
a form: create Country → Region → City → Place, then Trip → RouteVariant(s) → Day(s)
→ DayPlace/TransportLeg, plus BudgetBreakdown and TripScore. Publish toggles
`Trip.status` to `PUBLISHED`. No deploy needed — content goes live immediately.

## 2. Via Prisma Studio (works today)
```bash
cd backend
npx prisma studio   # opens a GUI at http://localhost:5555
```
Add rows directly. Remember the Real Data Policy: leave unknown prices/distances/
times as empty (`PENDING`) — do not type guesses.

## 3. Via a seed-style script
Copy `backend/prisma/seed.ts` to e.g. `prisma/seed-japan.ts`, follow the same
shape, and run `npx ts-node prisma/seed-japan.ts`.

## Required for a trip to appear on the site
- `Trip.status = PUBLISHED`
- `Trip.countryId` set
- at least one `RouteVariant`
- each `Day` ordered by `dayNumber`
- `Place.lat/lng` set if you want it on the map (else it lists in the fallback)

## Provenance checklist (per externally-sourced value)
- [ ] `source` filled (where it came from)
- [ ] `dataStatus` = `VERIFIED` only if confirmed against an official source
- [ ] `trustLevel` set (1/2/3)
- [ ] `fetchedAt` set
- [ ] unknowns left `PENDING` — **never** invented
