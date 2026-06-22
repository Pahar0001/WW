# Google Maps setup

The day-by-day map uses the **Google Maps JavaScript API** (client-side).

## 1. Get a key
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Maps JavaScript API** (and Places API if you later add place search).
3. Create an **API key** under *APIs & Services → Credentials*.
4. Restrict it: *Application restrictions → HTTP referrers* (add `http://localhost:3000/*`
   and your production domain). *API restrictions → Maps JavaScript API*.

## 2. Configure
In `.env`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```
The value is a build arg for the web container (see `docker-compose.yml`) and is
exposed to the browser by design — referrer restrictions are what protect it.

## 3. Behavior
- **Key present:** `components/map/TripMap.tsx` loads the JS SDK, plots the
  selected day's places, draws the path, and re-fits bounds on day change with a
  dark map style.
- **Key absent or load failure:** a refined static fallback lists the geocoded
  points and their coordinates. The app never shows a broken map and never
  fabricates coordinates.

## Cost note
Maps JS API has a monthly free tier. Keep referrer restrictions on to prevent
quota theft. For heavy usage, consider clustering and lazy-loading the map only on
the trip detail route (already the case here).
