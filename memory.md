# Project memory — Africa by Road

Last updated: 2026-08-01 WAT

## Map

- Backend: this repo, NestJS 11 + Mongoose/MongoDB + JWT; branch `nest-security-fixes`.
- Frontend: `/Users/ayotundeobasa/Documents/africa-by-road-v0-2`, Next.js 16 + React 19; branch `nest-security-fixes`.
- Main flows: email/Google auth, traveller registration, private documents, dashboard, community, giveaways, voting, and payments.

## Contracts and security

- Backend routes use `/api`; frontend base URL is `NEXT_PUBLIC_API_BASE_URL`.
- Browser auth uses a secure httpOnly cookie. Unsafe cookie-auth requests require an allowed `Origin`; bearer auth remains available for API clients.
- Registration requires verified email, personal fields, three uploaded documents, and at least one social handle. The API field is `nationality`, not `country`.
- Documents are multipart uploads (`type` + `file`), limited to 5 MB JPEG/PNG/PDF, signature-checked, and stored as authenticated Cloudinary assets.
- Payment checkout/verification requires auth. Webhooks fail closed on signature and re-verify reference, customer, amount, currency, and status with MeCash.
- OTP/reset secrets are hashed in MongoDB; reset query strings are excluded from logs. Production Swagger is off by default.

## Deployment

- Render free web service uses `render.yaml`; its filesystem is disposable and it may sleep after 15 minutes.
- MongoDB lives in an Atlas M0 free cluster, so records do not disappear when Render sleeps or redeploys.
- Cloudinary holds documents because Render local uploads would be lost.
- Set Atlas/Render/Cloudinary/SendGrid/payment secrets from `.env.example`; never commit real values.

## Verified

- Backend: build, 22 unit tests, 12 e2e tests, and production dependency audit pass.
- Frontend: lint, TypeScript, production build, live API smoke test, and production dependency audit pass.

## Next

Push both `nest-security-fixes` branches, create the Atlas/Cloudinary accounts, deploy the backend Blueprint on Render, set the frontend API URL, then run registration/upload/payment smoke tests against the deployed API.
