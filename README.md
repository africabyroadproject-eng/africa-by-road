# africa-by-road

NestJS + TypeScript + MongoDB (Mongoose) backend, organized as one Nest module per feature (`auth`, `admin`, `profile`, `app`, `public`, `community`, `giveaway`, `vote`, `payments`) under `src/modules`. Cross-cutting guards/filters/middleware live in `src/common`.

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, etc.
npm run start:dev
```

API runs on `http://localhost:4000`. Application routes are under `/api`; Swagger docs are at `/api-docs` outside production.

## Scripts

- `npm run start:dev` — watch mode
- `npm run build` — compile to `dist/`
- `npm run start:prod` — run compiled build
- `npm test` — unit tests (Jest)
- `npm run test:e2e` — end-to-end tests (supertest + in-memory MongoDB, no real DB needed)
- `npm run test:cov` — unit test coverage

## Deploying to Render (free tier)

`render.yaml` defines a free web service. Push the branch, create a new Render Blueprint from this repo, and fill in the `sync: false` env vars (Atlas URI, JWT secret, frontend URL, Cloudinary credentials, etc.) in the Render dashboard.

Free-tier web services spin down after ~15 minutes idle and cold-start on the next request (30-50s) — this only affects the API process, not your data. MongoDB lives in a separate, always-on Atlas cluster, so idle spin-down never touches stored data. The app logs to stdout only (no local file writes), so it's safe across Render's ephemeral filesystem and restarts.

## Payments

The `payments` module is present but intentionally unwired from `community`/`giveaway`/`vote` (no payment gate is enforced). Checkout and verification require authentication, and webhook payment state changes require both a valid signature and provider-side verification.
