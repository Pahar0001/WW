# External integrations & future AI agents

## Adapter pattern
Every provider implements `TravelAdapter` (`backend/src/modules/integrations/types.ts`)
and extends `BaseAdapter`. Until a real API key + the live call exist, an adapter
reports `NOT_CONFIGURED` and returns **zero** offers.

Add a provider:
```ts
class MyProviderAdapter extends BaseAdapter {
  readonly id = 'myprovider';
  readonly kinds = ['HOTEL'];
  protected readonly envKey = 'MYPROVIDER_API_KEY';
  async searchHotels(q) {
    if (!this.isConfigured()) return this.notConfigured();
    // call official API with process.env[this.envKey]; map response -> Offer[]
  }
}
```
Register it in `adapters.ts` → `ALL_ADAPTERS`. The registry fans out and ranks by
real price, then rating.

## Configured providers (interfaces ready)
Booking · Agoda · Trip.com · Skyscanner · 12Go · Yandex Travel · Expedia.
Keys via env only (`.env.example`) — never hardcoded.

## Legal / ToS rules (mandatory)
1. Official APIs with valid keys **only**.
2. Prefer free/open tiers; respect rate limits.
3. **No scraping. No ToS circumvention. No auth bypass. Respect robots.txt.**
4. If a provider offers no legal data access → keep the adapter as an interface
   stub; do not work around it.

## Data-source priority
- **Tier 1 (official):** official tourism sites, official maps, government sources, official APIs.
- **Tier 2:** Google Maps, OpenStreetMap, Wikidata, Wikipedia, Trip.com, Skyscanner, Agoda.
- **Tier 3:** Yandex Travel, 12Go, Booking, Expedia.

Map the chosen source to `source` + `trustLevel` (1/2/3) on each record.

## Future AI agents (architecture-ready)
The `recommendations` module is provider-agnostic. Planned agents, each behind a
small interface so they can be added without touching the domain:
- flight-search agent · hotel-search agent · weather agent
- itinerary-generation agent · price-comparison agent · recommendation agent

An agent consumes the same `Offer`/`Trip` contracts and writes back sourced data
with provenance. LLM calls (when added) should use the latest Claude models and
keep keys in env. Agents must obey the Real Data Policy — they may fetch and label
data, never fabricate it.
