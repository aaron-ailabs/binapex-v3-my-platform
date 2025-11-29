# Temporary Login Flags Deployment Plan

## Flags
- `ALLOW_LOGIN_WITHOUT_CSRF=1` — bypass CSRF validation for `/api/auth/login`.
- `DISABLE_LOGIN_RATE_LIMIT=1` — disable login rate limiting.

## Deployment (Vercel CLI)
- `vercel env add ALLOW_LOGIN_WITHOUT_CSRF 1 production`
- `vercel env add DISABLE_LOGIN_RATE_LIMIT 1 production`
- `vercel --prod`

## Test
- Acquire CSRF (optional): `GET /api/csrf`.
- Login: `POST /api/auth/login { username, password }`.
- Credentials: `admin@binapex.com` (maps to `admin`), `trader@binapex.com` (maps to `trader`).

## Rollback
- Remove flags:
  - `vercel env rm ALLOW_LOGIN_WITHOUT_CSRF production`
  - `vercel env rm DISABLE_LOGIN_RATE_LIMIT production`
- Redeploy: `vercel --prod`.

## Monitoring
- Observe 4xx/5xx in platform logs.
- Query metrics: `GET /api/metrics`.

## Security Verification
- Confirm CSRF required for `/api/auth/login`.
- Confirm 429 returned after >5 attempts per minute.
- Run smoke tests: `BASE_URL=<prod_url> npx tsx tests/login_smoke.ts`.
