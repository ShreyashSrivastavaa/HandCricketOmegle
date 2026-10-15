# 🚀 Hand Cricket Omegle — Production Deployment & Verification Guide

This guide details the deployment steps, environment requirements, security configuration, and operational verification checklist for **Hand Cricket Omegle**.

---

## 📋 Architecture Overview

Hand Cricket Omegle operates serverlessly on **Vercel** with zero extra persistent server processes:
1. **Next.js 15+ App Router** (React 19, TypeScript strict mode, Tailwind CSS).
2. **Ably Pub/Sub** (Token authentication with scoped capabilities for real-time signaling, match presence, and delivery reveals).
3. **Upstash Redis** (REST-based atomic queue pairing via Lua scripts, game state storage, and rate limiting).
4. **WebRTC P2P Video** (Ephemeral TURN/STUN credentials generated on-demand via `POST /api/ice` with pre-expiry refresh).
5. **On-Device Vision** (MediaPipe HandLandmarker dynamically lazy-loaded on client, capped at 15 FPS / 640x480).

---

## 🔑 Environment Variables Checklist

Set these environment variables in your Vercel Project Settings or local `.env.local`:

| Variable | Scope | Purpose | Required |
| :--- | :--- | :--- | :--- |
| `ABLY_API_KEY` | Server | Ably Pub/Sub token generation and event dispatching (`<app-id>.<key-id>:<secret>`). | **Yes** |
| `UPSTASH_REDIS_REST_URL` | Server | Upstash Redis REST endpoint for atomic matchmaking & state. | **Yes** |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Upstash Redis REST authorization token. | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Client & Server | Canonical application URL (e.g. `https://handcricket.app`). | **Yes** |
| `TURN_SECRET` | Server | HMAC-SHA1 secret key for generating short-lived TURN credentials (`POST /api/ice`). | Optional (Default STUN fallback) |
| `TURN_URLS` | Server | Comma-separated list of TURN/TURNS endpoints. | Optional |
| `ADMIN_SECRET_TOKEN` | Server | Secret bearer token for authenticating report action handlers. | Recommended |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Supabase project URL for report audits with RLS. | Optional |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anonymous public key. | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role key (strictly server-only). | Optional |

> [!CAUTION]
> **Zero Client Leak Guarantee (SEC-01)**: Never prefix `TURN_SECRET` or `ADMIN_SECRET_TOKEN` with `NEXT_PUBLIC_`. All ICE servers are dynamically fetched via `POST /api/ice`.

---

## 🛡️ Security & Privacy Policies

The application adheres to strict safety and privacy standards:
1. **Zero Video Storage**: No camera streams, canvas snapshots, or video frames are ever recorded, uploaded, or persisted. WebRTC streams are strictly direct peer-to-peer.
2. **18+ Age Gate Verification**: Enforces session-based age verification before entering any video queue.
3. **Automated Moderation**: $\ge 3$ unique reports within 24 hours automatically triggers a 24-hour matchmaking suspension for the offender.
4. **Mutual Blocklist Pairing**: Blocked stranger pairs are permanently isolated and will never match again.
5. **Content Security Policy (CSP)**: Strict headers configured in `next.config.mjs` preventing clickjacking (`X-Frame-Options: DENY`), MIME sniffing, and unauthorized camera access.

---

## 🛠️ Step-by-Step Vercel Deployment

### 1. Push Code to GitHub
```bash
git push origin main
```

### 2. Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** $\rightarrow$ **Project**.
3. Select your `HandCricketOmegle` repository.
4. Set Framework Preset: **Next.js**.
5. Configure Environment Variables listed in the checklist above.
6. Click **Deploy**.

### 3. Verify Database & Realtime Connections
Once deployed, verify the system health endpoint:
```bash
curl -i https://your-deployment.vercel.app/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "redis": "connected",
  "ably": "configured",
  "timestamp": 1729000000000
}
```

---

## ✅ Pre-Flight Verification Checklist

Before opening to public traffic, verify each check:

- [x] **Lint & Types**: Run `npm run lint` and `npx tsc --noEmit` (0 errors).
- [x] **Unit & Integration Tests**: Run `npm test` (all 11 test suites and 117+ tests pass).
- [x] **Production Bundle**: Run `npm run build` (all 22 routes compile statically/dynamically).
- [x] **Ephemeral TURN Traversal**: Test `POST /api/ice` returns credentials with positive `expiresAt` timestamp.
- [x] **5-Second Mutual Ready Check**: Confirm both players see countdown and match launches only after confirmation.
- [x] **Bot Warmup Practice**: Enter matchmaking and verify "Warm Up vs Bot" plays smoothly without canceling background search.
- [x] **Endless Series Alternation**: Complete Game 1 and vote rematch; verify Game 2 alternates toss roles.
- [x] **Screen Wake Lock**: Verify active match holds wake lock and re-acquires on tab visibility change.
- [x] **Accessibility**: Verify numberpad hotkeys `1`–`6`, `Enter`/`Space` lock-in, and `prefers-reduced-motion` compliance.
