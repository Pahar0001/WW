# Deployment

`docker compose up --build` from the repo root brings up Postgres, the API, and the
web app. Dockerfiles live in `backend/` and `frontend/`.

## Production checklist
- Set strong `POSTGRES_PASSWORD`, a real `NEXTAUTH_SECRET`, and `NODE_ENV=production`.
- Switch the backend boot command from `prisma db push` to `prisma migrate deploy`
  (commit a migration first — see docs/DATABASE.md).
- Put the web app behind a CDN/reverse proxy with HTTPS; restrict the Google Maps
  key by referrer.
- Provide provider API keys via your secret manager, not `.env` in the image.
