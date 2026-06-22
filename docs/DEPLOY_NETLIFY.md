# Deploying Vela (Netlify + backend host)

**Important reality check.** Netlify hosts the **frontend** (Next.js) and serverless
functions. It does **not** run a long-lived NestJS server or a PostgreSQL database.
So a real deployment is split across two places:

```
┌────────────────────┐         HTTPS          ┌──────────────────────┐
│  Netlify           │  ───────────────────▶  │  Render / Railway    │
│  Next.js frontend  │   NEXT_PUBLIC_API_URL  │  NestJS API + Docker │
└────────────────────┘                        │  Managed PostgreSQL  │
                                               └──────────────────────┘
```

You need a GitHub (or GitLab) repository — both Netlify and Render deploy from git.

---

## Step 0 — Push the repo to GitHub
```bash
cd ~/Desktop/Repository
git remote add origin https://github.com/<you>/vela.git
git push -u origin main      # or your branch
```

---

## Step 1 — Database + backend on Render (free tier works)

### 1a. PostgreSQL
1. Render dashboard → **New → PostgreSQL**.
2. Name it `vela-db`, pick a region, create.
3. Copy the **Internal Database URL** (looks like `postgresql://...`). This is your `DATABASE_URL`.

### 1b. Backend (Docker)
1. **New → Web Service** → connect your repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (Render auto-detects `backend/Dockerfile`)
   - **Instance type:** Free or Starter
3. **Environment variables:**
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | the Internal Database URL from 1a |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Netlify URL (fill after Step 2, e.g. `https://vela.netlify.app`) |
   > `PORT` is provided by Render automatically — the app already reads it.
4. Create the service. On boot the container runs `prisma db push` + seed + start
   (this is the Dockerfile `CMD`). Wait for "Vela API listening…" in logs.
5. Note the public URL, e.g. `https://vela-api.onrender.com`.
6. Sanity check: open `https://vela-api.onrender.com/api/health` → `{"status":"ok"}`.

> Render free instances sleep when idle; the first request after a nap is slow.
> That's a Render limitation, not a bug.

---

## Step 2 — Frontend on Netlify
1. Netlify → **Add new site → Import an existing project** → pick your repo.
2. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next` (the Next runtime/plugin manages this)
   - The committed `frontend/netlify.toml` already sets these + Node 20 + the
     `@netlify/plugin-nextjs` runtime.
3. **Environment variables** (Site settings → Environment):
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://vela-api.onrender.com/api` (your backend URL + `/api`) |
   > Do **not** set `API_INTERNAL_URL` here — that's only for Docker networking.
   > Outside Docker the server and browser both use `NEXT_PUBLIC_API_URL`.
4. Deploy. You get a URL like `https://vela.netlify.app`.

---

## Step 3 — Connect them (CORS)
1. Back in Render, set `CORS_ORIGIN` to your exact Netlify URL
   (`https://vela.netlify.app`) and redeploy the backend.
2. Open the Netlify URL — the China trip and the map should load from the live API.

---

## Checklist / troubleshooting
- **"No trips" on the live site** → `NEXT_PUBLIC_API_URL` is wrong, or backend is
  down/asleep. Hit `/api/health` directly to confirm the API is up.
- **CORS error in the browser console** → `CORS_ORIGIN` on Render doesn't match the
  Netlify domain exactly (scheme + host, no trailing slash).
- **Map empty** → expected for travel/rest days; otherwise check the place has
  coordinates. The map uses OpenStreetMap and needs no key.
- **Env var changes don't apply** → both Netlify and Render require a **redeploy**
  after changing variables (`NEXT_PUBLIC_*` is baked in at build time).
- **Secrets** → never commit `.env`; set all secrets in the dashboards.

---

## Simpler alternative (one platform)
If splitting across two hosts is annoying, **Railway** or **Render Blueprint** can
run the whole `docker-compose` stack (web + api + db) together from this repo. That
avoids Netlify entirely but keeps everything in one place. Netlify is the right
choice only if you specifically want their frontend platform/CDN.
