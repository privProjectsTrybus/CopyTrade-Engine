# CopyTrade Engine

A copy-trading and AI-strategy platform for Binance/Bybit, built for personal use,
deployable for free on Vercel + a free-tier Postgres host.

This is a **new, separate project** from CopyTrader Pro — not an extension of it.

## Status: Stage 1 of 3 — Auth + Data Model

What's in this drop:

- Full Prisma schema covering users/auth, exchange connections, traders,
  copy relationships, risk profiles, trades/positions, notifications, audit logs.
- NextAuth: email+password (bcrypt), Google OAuth, TOTP-based 2FA enrollment
  and verification, audit logging on login success/failure/2FA events.
- AES-256-GCM encryption helper for exchange API credentials at rest.
- In-memory rate limiting on registration (free-tier substitute for Redis;
  swappable for Upstash later without changing call sites).
- Minimal login/register pages and a placeholder landing page.

Not yet built (coming in Stage 2 — engine, and Stage 3 — AI/admin/notifications):
exchange connection UI, copy trader marketplace, copy engine, risk engine
enforcement, AI trading module, portfolio analytics, admin panel, notification
delivery, full landing/dashboard design.

## Architecture decisions (free-tier constraints)

The original spec calls for Redis caching and background workers separated
from the Vercel frontend runtime. Both cost money to run continuously, so:

- **No Redis.** Rate limiting is in-memory per serverless instance (approximate,
  not a hard guarantee — fine for slowing brute force, not bank-grade).
- **No persistent worker process.** Vercel serverless functions can't run
  long-lived processes. Trade execution and price streaming will run
  **client-side in the browser**, the same pattern proven in CopyTrader Pro:
  the browser holds the WebSocket connections and signs requests with the
  Web Crypto API, so exchange API secrets never need to leave the browser in
  plaintext, and there's no geo-blocking issue from Vercel's servers.
  **Trade-off: the copy engine only runs while a browser tab is open and
  logged in.** This will be made very visible in the dashboard UI ("Engine: Live"
  vs "Engine: Offline") in Stage 2, rather than silently failing to execute.
- Anywhere the spec implies a swappable real integration, interfaces are
  written so a paid worker host (Railway/Fly.io/a cheap VPS) can be dropped
  in later with minimal changes — the encryption layer and DB schema don't
  care where signing happens.

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — free Postgres from [Neon](https://neon.tech) or [Supabase](https://supabase.com)
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `CREDENTIAL_ENCRYPTION_KEY` — `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (optional for now; credentials login works without it)

2. Install dependencies:
   ```bash
   npm install
   ```

3. Push the schema to your database:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Run locally:
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`, register an account, sign in.

## Deploying to Vercel (free)

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add all `.env.example` variables in Project Settings → Environment Variables.
4. Set the build command to also run `prisma generate` (Vercel usually detects
   this automatically via the `postinstall` hook — add one if it doesn't:
   `"postinstall": "prisma generate"` in `package.json`).
5. Deploy.

## Next steps (say "continue to stage 2" when ready)

Stage 2 will add: exchange connection flow (Binance/Bybit API key entry +
permission check warning for withdrawal access), browser-side signing
client, exchange dashboard (balances/positions), copy trader marketplace
with mock trader data, trader profile pages, copy settings UI, the copy
engine workflow, and risk engine enforcement.

---

## Stage 2 — Exchange Engine + UI (completed)

What's added in this drop:

**Exchange layer**
- `src/lib/exchange/types.ts` — `ExchangeClient` interface (swap Binance/Bybit for any exchange)
- `src/lib/exchange/signing.ts` — Web Crypto API HMAC-SHA256 signing (browser + Edge safe)
- `src/lib/exchange/binance.ts` — Binance USDT-M Futures client (all signed browser-side)
- `src/lib/exchange/bybit.ts` — Bybit V5 Unified client (all signed browser-side)

**Risk engine** (`src/lib/riskEngine.ts`)
- Checks: daily/weekly/monthly loss caps, max open positions, account exposure %, per-trade risk %
- Hard leverage cap: 20x regardless of user settings
- `calculatePositionSize()` — handles EXACT_MIRROR / SCALED_MIRROR / FIXED_DOLLAR sizing modes

**Copy engine** (`src/lib/copyEngine.ts`)
- Runs in the browser, polls `/api/traders/signals` every 5 seconds
- Full workflow: signal detection → risk check → size calculation → leverage set → market order → SL/TP attachment → position sync
- Gracefully handles exchange unreachability per tick without crashing

**API routes added**
- `POST /api/exchange/connect` — encrypt + store credentials
- `GET  /api/exchange/list` — list user connections (no secrets)
- `GET  /api/exchange/credentials` — decrypt + return to authenticated browser
- `POST /api/exchange/disconnect` — soft-delete + cascade pause copy rels
- `GET  /api/traders` — marketplace with sort/filter
- `GET  /api/traders/[id]` — full trader profile
- `GET  /api/traders/signals` — active signals for copy engine
- `POST /api/copy/start` — create/update copy relationship
- `POST /api/copy/stop` — deactivate relationship
- `GET  /api/copy/list` — active copies for engine + dashboard
- `GET  /api/risk` — user risk profile
- `PUT  /api/risk` — update risk limits
- `POST /api/risk/pause` — engine auto-pause on limit breach
- `POST /api/positions/sync` — replaces DB positions with live exchange state
- `POST /api/trade/record` — log executed trade to DB
- `POST /api/engine/event` — log engine events + create notifications
- `GET  /api/portfolio/pnl-summary` — realized PnL per day/week/month

**Pages**
- `/dashboard` — engine on/off, PnL stats, active copies, live event feed
- `/exchanges` — connect/disconnect Binance/Bybit, live account balances (browser-fetched), withdraw permission warning
- `/copy-trading` — trader marketplace with sort, filter, copy modal with full settings
- `/traders/[id]` — profile with equity curve (Line), monthly returns (Bar), open positions table
- `/settings` — risk limits form, engine pause status + resume button

**Seed** (`prisma/seed.ts`)
- 12 realistic mock traders (AlphaWave, GhostScalp, StellarMomentum, IronVault, NeonBreak, QuantDelta, TideRider, CryptoNova, ZenTrend, PulseTrack, ColdLogic, VelocityX)
- Each has full statistics, 18 months of synthetic monthly returns, and live open signals

## Full setup for Stage 2

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_SECRET, CREDENTIAL_ENCRYPTION_KEY
npx prisma migrate dev --name stage2
npx prisma db seed            # loads the 12 mock traders
npm run dev
```

Visit `http://localhost:3000/register` → create account → connect an exchange → browse `/copy-trading` → start the engine from `/dashboard`.

## Next steps (Stage 3)

- Full landing page design with animated hero, features, pricing
- Portfolio analytics page (equity curve, Sharpe ratio, Sortino ratio, monthly returns)
- AI trading module with configurable strategies
- Admin panel
- Telegram + Discord + email notifications
- Settings page for notification preferences
