Deployment Guide (Vercel)

Environment Variables
- `NODE_ENV=production`
- `JWT_SECRET` (required)
- `ENCRYPTION_KEY` (required)
- `ENCRYPTION_SALT` (required)
- `DATABASE_URL` (optional for Neon/Drizzle)
- `SUPABASE_URL` or `SUPABASE_PROJECT_URL` (optional)
- `SUPABASE_SERVICE_ROLE` or `SUPABASE_SERVICE_ROLE_KEY` (optional)
- `CORS_ORIGIN` (optional, defaults to `*`)

Build & Output
- Build command: `npm run build`
- Client output: `client/dist`
- API served via `@vercel/node` from `server/index.ts`

Routing & Caching
- Rewrites: `/api/(.*)` → serverless handler; SPA fallback `/` → `client/dist/index.html`
- Static asset headers: `Cache-Control: public, max-age=31536000, immutable`

Workflow
- Connect repository to Vercel
- Set required environment variables for Production and Preview
- Trigger build; ensure Vercel checks pass
- Validate staging preview: health, auth, profile, credit-score, SSE

Rollback
- Use Vercel dashboard to promote previous deployment
- Revert environment variable changes if necessary

Notes
- WebSockets are disabled on Vercel serverless; SSE streams are supported
- Security headers and TLS enforcement are enabled for production
