# Binapex Trading Platform — User Guide

## Overview

Binapex is a multi‑role fintech trading platform with:
- Client: React + Vite + Tailwind, Radix UI components
- Server: Express with JWT auth, SSE price stream, WebSocket chat
- Roles: Trader, Admin, Customer Service

Key features:
- Real‑time charting and prices (SSE), configurable engine spread and payout
- Deposits/Withdrawals workflows with security controls (withdrawal password)
- Live trading with simulated settlement and audit trail
- Support tickets and live chat with AI fallback

## Getting Started (Local)

1. Install: `npm ci`
2. Run: `npm run dev`
3. Open: `http://localhost:5000/`
4. Seed demo data (optional): `curl -X POST http://localhost:5000/api/demo/seed`

## Trader Guide

- Login/Register: Use the Auth page (`/auth`). Demo accounts:
  - `trader@binapex.com` / `password`
  - `admin@binapex.com` / `password`
  - `support@binapex.com` / `password`
- Dashboard: Portfolio snapshot
- Deposits: Submit funding requests and upload proof (`Deposits` page)
- Security:
  - Set a withdrawal password (requires verification code)
  - View security events
- Live Trading:
  - Choose market/asset, set amount and duration, place HIGH/LOW trades
  - Prices stream via `/api/prices/stream`; optional AlphaVantage rate fetch for FX pairs
- Trade History: Auto‑refreshes from `/api/trades`
- Withdrawals:
  - Provide destination, amount, and withdrawal password

## Admin Guide

- Dashboard: User, KYC, withdrawal metrics
- Users/KYC/Transactions: Manage mock data lists
- Engine Settings:
  - GET `/api/engine`
  - POST `/api/engine` `{ spreadBps, payoutPct }`
- Assets:
  - GET `/api/assets`
  - POST `/api/assets/toggle` `{ symbol, enabled }` (role: Admin)
- Trades Override:
  - POST `/api/admin/trades/override` `{ tradeId, result, exitPrice? }`
- Audit Log:
  - GET `/api/admin/audit`

## Customer Service Guide

- Presence: Update availability
  - POST `/api/support/presence` `{ status: 'online'|'away'|'offline', waitTimeMins }`
- Live Chat:
  - Join session by `sessionId` and chat with trader
  - Fetch transcript: GET `/api/chat/history/:sessionId`
- Tickets: Manage queue and close tickets

## Environment Variables

- `PORT` (default `5000`)
- `JWT_SECRET` (dev default provided)
- `LOG_WINDOW_MS`, `LOG_MAX` (API log suppression)
- `ALPHAVANTAGE_API_KEY` (enable FX rate fetch)
- `ENCRYPTION_KEY`, `ENCRYPTION_SALT` (crypto for withdrawal password)
- `TRADING_DURATION_SCALE` (speed up simulated durations)
- `DATABASE_URL` (Drizzle config; not yet used by server)

Client build‑time:
- `VITE_API_BASE` (default `/api`)
- `VITE_WS_BASE` (default same host)

## Key Endpoints

- Auth: `POST /api/auth/login`, `GET /api/auth/verify`
- Seed: `POST /api/demo/seed`
- Security: request/verify codes, set/verify withdrawal password, list events
- Prices: `GET /api/prices/stream`, `GET /api/prices/alpha`
- Trades: `GET/POST /api/trades`
- Wallets: `GET /api/wallets`
- Deposits: `POST /api/deposits`
- Withdrawals: `POST /api/withdrawals`
- Support: `/api/support/status`, `/api/support/session`, `/ws`

## Missing or To‑Improve

- Persistent database integration (Drizzle/Neon); replace in‑memory storage
- Secure user registration/login endpoints (hashed passwords, email confirmation)
- 2FA and verification delivery (email/SMS providers)
- Real deposit/withdrawal approval flows and admin actions
- Price sources for all markets (Binance/TradingView/WebSocket feeds)
- Production‑grade file storage for chat attachments
- Align client deposits with server `/api/deposits` (currently local only)
- KYC endpoints and workflows (server‑side processing)
- Role‑based access enforcement across all admin/CS actions
- Observability: metrics, structured logs, audit expansion
- `.env.example` and deployment docs; Docker/CI/CD

## Security Notes

- TLS enforced for sensitive routes outside development
- Rate limiting applied to security endpoints
- Withdrawal passwords are hashed and encrypted; login passwords are plain in mock data and must be hardened

---
This guide reflects current local behavior; integration items are listed to reach production readiness.
