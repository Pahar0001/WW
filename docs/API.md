# API

Base URL: `http://localhost:4000/api`. JSON over HTTP. All responses include
provenance fields where applicable.

## Health
`GET /health` → `{ status, db: "up"|"down", timestamp }`

## Trips
`GET /trips` → list of `PUBLISHED` trips (country, scores, variant summaries).

`GET /trips/:slug` → full trip graph:
```jsonc
{
  "slug": "china-floating-mountains",
  "title": "China — The Floating Mountains",
  "durationDays": 14,
  "country": { "name": "China", "nameLocal": "中国" },
  "scores": { "overall": 80, "comfort": 74, ... },
  "opinions": [ { "persona": "skeptic", "verdict": "...", "rating": 60 } ],
  "variants": [
    {
      "pace": "BALANCED",
      "budget": { "currency": "RUB", "lines": [ { "category": "FLIGHTS", "amount": null, "dataStatus": "PENDING" } ] },
      "days": [
        {
          "dayNumber": 2,
          "title": "Forbidden City & Temple of Heaven",
          "places": [ { "order": 0, "place": { "name": "...", "lat": 39.91, "dataStatus": "ESTIMATED" } } ],
          "legs": [ { "mode": "HIGH_SPEED_RAIL", "durationMin": null, "dataStatus": "PENDING" } ]
        }
      ]
    }
  ]
}
```

## Routes (load analysis)
`GET /routes/variant/:id/analysis` → live load index per day + relaxation verdict
(`ok` | `too-heavy` | `too-empty`). Load is an **ESTIMATED** heuristic, flagged as such.

## Recommendations (AI planner contract)
`POST /recommendations/plan`
```jsonc
// body
{ "days": 14, "budgetRub": 350000, "pacePreference": "balanced", "interests": ["nature","history"], "month": 4 }
// response
{ "recommendedPace": "BALANCED", "rationale": "...", "options": [...], "dataNote": "..." }
```
Returns a recommended *pace*; concrete days/prices come only from sourced trip data.

## Integrations
`GET /integrations/status` → readiness of each provider adapter (`configured: bool`).

`GET /integrations/hotels?city=&checkIn=&checkOut=` → fan-out across configured
providers + best-value ranking. Unconfigured providers return `NOT_CONFIGURED`
with **zero** offers — no fabricated prices.

## Analytics (first-party)
`POST /analytics/event` `{ name, path?, props? }` · `GET /analytics/summary`.
