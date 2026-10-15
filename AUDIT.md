# 🔍 Hand Cricket Omegle — Security, Reliability, Privacy & Performance Audit

**Audit Date:** October 2026  
**Audited Target:** Hand Cricket Omegle Web Application (Next.js App Router, React 19, WebRTC, MediaPipe, Supabase / Redis / Ably Serverless Architecture)  
**Status:** Phase 0 Completed (Diagnostic Only — No Behavioral Changes Introduced)

---

## Executive Summary

This comprehensive audit evaluates the Hand Cricket Omegle codebase across four mission-critical operational pillars:
1. **Security & Cryptography** (Server authorization, credential leakage, admin authentication, access policies)
2. **Reliability & State Synchronization** (PeerJS/WebRTC disconnect resilience, race conditions, memory & track leaks, tab backgrounding)
3. **Privacy & Legal Safety** (Stranger video moderation, 18+ age gate verification, reporting/blocking pipelines, terms & compliance)
4. **Performance & Architecture** (MediaPipe/TF.js bundle costs, frame rate throttling, component modularity)

Findings are categorized by severity:
- **CRITICAL** (Must be fixed before any production or stranger traffic)
- **HIGH** (Significant security, privacy, or stability degradation)
- **MEDIUM** (Operational risk, memory leaks, or reliability anomalies)
- **LOW** (Code hygiene, defensive programming, minor optimizations)

---

## 1. Security Findings

### [CRITICAL] SEC-01: Client-Side TURN Credentials Exposed via `NEXT_PUBLIC_*`
- **File:** `src/lib/webrtc/webrtcManager.ts#L61-L76`
- **Severity:** CRITICAL
- **Description:**
  `webrtcManager.ts` inspects `(window as any).__ICE_SERVERS__ || process.env.NEXT_PUBLIC_ICE_SERVERS`. Environment variables prefixed with `NEXT_PUBLIC_` are baked into the client-side JavaScript bundle during build time. Any user inspecting web assets or the DOM can extract active TURN credentials, allowing malicious actors to hijack relay bandwidth, run up cloud infrastructure costs, and compromise network privacy.
- **Proposed Fix (Phase 2 & 3):**
  1. Remove `NEXT_PUBLIC_ICE_SERVERS` and `NEXT_PUBLIC_TURN_*` from all client-facing files and `.env.example`.
  2. Implement an authenticated serverless route handler `POST /api/ice` (Node.js runtime) that generates short-lived, time-limited TURN credentials (e.g., using Cloudflare Calls, Twilio Network Traversal, or Xirsys REST API / HMAC expiration tokens).
  3. Rotate all existing exposed TURN credentials immediately.

---

### [CRITICAL] SEC-02: Admin Dashboard Uses Plaintext Password & Client-Side Verification
- **File:** `src/app/admin/reports/page.tsx#L25-L65`
- **Severity:** CRITICAL
- **Description:**
  The administration view (`/admin/reports`) takes an administrator password directly into React state and attaches it as a cleartext header `x-admin-password: password` in fetch requests to `/api/admin/reports`. There is no Supabase Auth session, no JWT verification with an `admin` role claim, no cryptographic signature, and no brute-force rate limiting on incorrect passwords.
- **Proposed Fix (Phase 2):**
  1. Deprecate the shared static password flow.
  2. Migrate admin authentication to Supabase Auth using email/password or OAuth with an `app_metadata.role = 'admin'` claim.
  3. Enforce admin role authorization via server-side middleware and Row-Level Security (RLS) policies on report tables.

---

### [CRITICAL] SEC-03: Client-Authoritative Game Resolution in P2P / Socket Rooms
- **File:** `src/app/room/[code]/page.tsx#L30-L37`, `src/app/play/match/page.tsx#L27-L34`, `src/server/socketHandler.ts#L230-L280`
- **Severity:** CRITICAL
- **Description:**
  In peer-to-peer and custom socket implementations, delivery outcomes (`applyBall`), innings transitions (`startSecondInnings`), and toss decisions are executed within the client's local memory or sent as plain picks before both players have locked in. A compromised client or browser console command can intercept the opponent's choice or forge an out-of-sequence delivery outcome.
- **Proposed Fix (Phase 3):**
  1. Make the server strictly authoritative for all stranger matches using `/lib/game/engine.ts` with Redis-backed state (`match:{id}`).
  2. Implement a two-phase "commit then reveal" protocol: clients send a secret pick, the server stores it without broadcasting, and publishes the resolved `ball-resolved` event only after both picks are locked in.
  3. Validate move inputs with Zod schemas and enforce sequence numbering (`seq`) to reject stale or replayed submissions.

---

### [HIGH] SEC-04: Supabase Tables & Storage Lack Comprehensive Row-Level Security (RLS)
- **File:** Supabase database integration layer (referenced in `src/server/safetyStore.ts`, `src/lib/server/redis.ts`)
- **Severity:** HIGH
- **Description:**
  When Supabase tables (such as `reports`, `bans`, `users`, or `matches`) are queried using the public anonymous key (`SUPABASE_ANON_KEY`), missing or permissive RLS policies allow any user to execute unauthorized `SELECT`, `UPDATE`, or `DELETE` statements on other users' records.
- **Proposed Fix (Phase 2):**
  1. Enable RLS (`ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`) on every table in `/supabase/migrations`.
  2. Write explicit policies:
     - `reports`: Anyone can `INSERT` their own report, but only users with `auth.jwt() ->> 'role' = 'admin'` can `SELECT` or `UPDATE`.
     - `profiles`: Users can `SELECT` public profile data, but can only `UPDATE` their own record (`auth.uid() = user_id`).
  3. Never use `service_role` keys on the client; reserve `service_role` strictly for Node.js Route Handlers.

---

### [HIGH] SEC-05: Guessability and Brute-Force Risk of 6-Character Room Codes
- **File:** `src/server/roomStore.ts#L50-L70`
- **Severity:** HIGH
- **Description:**
  Friend rooms use a 6-character code (`CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"`). While $32^6 \approx 10^9$ possibilities exist, in-memory rate limiting (`guestRateLimits`) is lost on process restart or across distributed serverless lambdas. Attackers can automate code enumeration to intrude on private stranger or friend video sessions.
- **Proposed Fix (Phase 1 & 3):**
  1. Move room code storage and join rate limits into Upstash Redis (`ratelimit:room_join:{ip}`) to guarantee atomic enforcement across serverless instances.
  2. Implement exponential backoff lockout after 5 consecutive failed room code attempts.
  3. Add mutual host approval (ready-check gate) before establishing video streaming.

---

### [MEDIUM] SEC-06: Potential XSS and Injection in Display Names
- **File:** `src/server/socketHandler.ts#L60-L75`, `src/components/Lobby.tsx#L250-L270`, `src/app/room/[code]/page.tsx#L400-L420`
- **Severity:** MEDIUM
- **Description:**
  Guest display names (e.g. customized in `Lobby.tsx`) are accepted from user input and rendered in DOM structures or passed to other peers without strict length and character sanitization, presenting potential HTML injection or UI spoofing risks.
- **Proposed Fix (Phase 1 & 2):**
  1. Enforce strict Zod validation on all names: `/^[a-zA-Z0-9_\- ]{3,20}$/`.
  2. Sanitize and escape all rendered names in React components.

---

## 2. Reliability & State Synchronization Findings

### [HIGH] REL-01: Stale Peer State and Unhandled WebRTC Disconnects
- **File:** `src/lib/webrtc/webrtcManager.ts#L280-L325`
- **Severity:** HIGH
- **Description:**
  When a peer abruptly closes their laptop lid, loses Wi-Fi connection, or terminates the browser, WebRTC `iceConnectionState` transitions to `"disconnected"` or `"failed"`. `webrtcManager.ts` lacks an automated ICE restart handshake and has no grace period timer for P2P matches, leading to stalled game states where one client hangs indefinitely waiting for opponent input.
- **Proposed Fix (Phase 1 & 3):**
  1. Add an automated 15-second forfeit countdown timer backed by Ably presence or heartbeat monitoring.
  2. Implement an explicit `restartIce()` routine in `webrtcManager.ts` when connection transitions to `"disconnected"`.
  3. Provide a clear banner to the remaining user ("Opponent connection lost, waiting 15s...") with graceful forfeit resolution if they fail to reconnect.

---

### [HIGH] REL-02: Race Conditions in Matchmaking Queue and Mutual Ready-Checks
- **File:** `src/server/matchmaker.ts#L80-L140`, `src/server/socketHandler.ts#L70-L110`
- **Severity:** HIGH
- **Description:**
  Matchmaking pairings in memory are susceptible to concurrency race conditions: two players dequeuing simultaneously or one player cancelling just as they are paired can cause one player to connect to a ghost peer.
- **Proposed Fix (Phase 3):**
  1. Implement atomic Redis matchmaking using a Lua script with sorted sets (`ZADD`, `ZRANGE`, `ZREM`).
  2. Store paired match states with a 20-second ready-check window: if either player fails to confirm ready within 5 seconds, the non-responsive player is dropped and the responsive player returns to the front of the queue.

---

### [MEDIUM] REL-03: Camera Track and MediaStream Memory Leaks on Component Unmount
- **File:** `src/components/CameraCheckModal.tsx#L60-L80`, `src/components/VideoTiles.tsx#L120-L160`, `src/app/room/[code]/page.tsx#L1200-L1250`
- **Severity:** MEDIUM
- **Description:**
  `navigator.mediaDevices.getUserMedia` streams are acquired in several modals and pages. In multiple unmount cleanup handlers (`useEffect` return functions), video tracks (`stream.getTracks().forEach(t => t.stop())`) are either not invoked or only audio tracks are stopped. This leaves the hardware camera active (green camera indicator light remains on) and leaks memory over prolonged sessions.
- **Proposed Fix (Phase 1):**
  1. Consolidate camera lifecycle into a single reusable hook `useCameraStream()` with guaranteed unmount track termination.
  2. Ensure `webrtcManager.stopLocalStream()` and `handDetector.stop()` are called unconditionally on page navigation or modal dismissal.

---

### [MEDIUM] REL-04: Background Tab Throttling Stalls Gesture Detection & Timers
- **File:** `src/lib/gesture/handDetector.ts#L140-L155`
- **Severity:** MEDIUM
- **Description:**
  `HandDetector` relies on `requestAnimationFrame` for its detection loop. Modern mobile and desktop browsers (Chrome, Safari) aggressively throttle or freeze `requestAnimationFrame` when the user switches tabs or minimizes the application. This causes gesture tracking to halt completely while the 10-second ball countdown continues, leading to unintentional timeouts.
- **Proposed Fix (Phase 1 & 4):**
  1. Bind `document.addEventListener("visibilitychange")` to pause and resume detection gracefully.
  2. Keep server-side timers as the ultimate single source of truth, sending synchronization timestamps to the client.
  3. Integrate the Screen Wake Lock API (`navigator.wakeLock.request("screen")`) during active matches.

---

## 3. Privacy, Safety & Legal Findings

### [CRITICAL] PRIV-01: Stranger Video Streaming Without Server-Side Moderation
- **File:** `src/lib/safety/nsfwScanner.ts#L35-L80`, `src/lib/webrtc/webrtcManager.ts#L120-L150`
- **Severity:** CRITICAL
- **Description:**
  The application currently relies on an optional on-device client-side TensorFlow/NSFWJS scanner (`nsfwScanner.ts`). Because this code runs in the user's browser, any malicious participant can bypass it, block the script from loading, or modify the thresholds in DevTools. Furthermore, peer video streams connect immediately upon room entry without mutual opt-in or ready confirmation.
- **Proposed Fix (Phase 2):**
  1. Video must start **off or blurred** by default until both participants explicitly click "Ready" in a two-way ready check.
  2. Add a prominent "Blur Opponent Video" toggle accessible at any time.
  3. Never store or record video frames on any server or database.

---

### [HIGH] PRIV-02: Age Gate Stored Only in Transient Client State
- **File:** `src/components/AgeGateModal.tsx#L30-L50`, `src/server/roomStore.ts#L15`
- **Severity:** HIGH
- **Description:**
  The 18+ age verification gate is handled purely in client React state. Refreshing the browser or interacting directly with the WebSocket/API allows unconfirmed clients to enter stranger video queues without verifying age requirements.
- **Proposed Fix (Phase 2):**
  1. Enforce age confirmation at the session level: store `age_verified: true` in an `httpOnly`, encrypted cookie or verified user profile.
  2. Reject stranger queue entry at the API route level (`POST /api/queue/join`) if age verification is absent.

---

### [HIGH] PRIV-03: Lack of Mutual Block List in Queue Matching
- **File:** `src/components/ReportModal.tsx#L50-L90`, `src/server/matchmaker.ts#L60-L90`
- **Severity:** HIGH
- **Description:**
  While players can report an opponent, the report action does not immediately prevent the matchmaking queue from immediately repairing the same two strangers in the subsequent match.
- **Proposed Fix (Phase 2 & 3):**
  1. Add a persistent `blocked_users` record in Redis / Supabase associated with the guest session.
  2. In the matchmaking pairing logic, explicitly check `SISMEMBER blocklist:{guestA} {guestB}` and ensure recent opponents are never re-matched for at least 5 minutes.

---

### [MEDIUM] PRIV-04: Missing Formal Terms of Service and Community Guidelines
- **File:** `src/app/privacy/page.tsx`
- **Severity:** MEDIUM
- **Description:**
  The current application only has a rudimentary privacy summary. For an Omegle-style stranger platform involving peer video, legal compliance requires explicit Terms of Service, Community Standards (zero tolerance for harassment, nudity, or hate speech), and clear copyright/reporting disclaimers.
- **Proposed Fix (Phase 2):**
  1. Create `/terms` and `/guidelines` pages detailing acceptable use policies and reporting procedures.
  2. Link these terms directly inside the Age Gate modal and footer.

---

## 4. Performance & Architecture Findings

### [HIGH] PERF-01: Heavy Client Bundle Cost from MediaPipe and TensorFlow.js
- **File:** `src/lib/gesture/handDetector.ts#L42-L60`, `src/lib/safety/nsfwScanner.ts#L53-L60`
- **Severity:** HIGH
- **Description:**
  Eagerly importing `@mediapipe/tasks-vision` (~10MB wasm and float16 model assets) and injecting `@tensorflow/tfjs` significantly impacts Largest Contentful Paint (LCP) and mobile data consumption, especially on low-bandwidth 4G/3G mobile networks.
- **Proposed Fix (Phase 1 & 5):**
  1. Lazy-load MediaPipe HandLandmarker only when the user explicitly enables Camera/Gesture mode.
  2. Cache the wasm and task model files locally in `public/models/` or via service worker caching.
  3. Throttle vision processing to 15 FPS with a 640x480 resolution cap.

---

### [MEDIUM] PERF-02: Monolithic Page Components Exceeding 1,000+ Lines
- **File:** `src/app/room/[code]/page.tsx` (1,253 lines), `src/app/play/match/page.tsx` (1,014 lines), `src/components/Lobby.tsx` (823 lines)
- **Severity:** MEDIUM
- **Description:**
  These large components couple UI presentation, WebRTC connection lifecycle, gesture stabilizer polling, countdown timers, and game state logic in single giant files, making testing difficult and leading to unnecessary re-renders.
- **Proposed Fix (Phase 1):**
  1. Extract logic into focused custom hooks:
     - `useGestureTracking()` (MediaPipe detection and debouncing)
     - `useTurnCountdown()` (10-second timer and auto-pick)
     - `useStrangerMatch()` / `useFriendRoom()` (Connection and state coordinator)
  2. Break down UI into modular subcomponents without changing any visual styling or user workflows.

---

## Summary Matrix of Findings

| ID | Category | Severity | File Reference | Primary Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security | **CRITICAL** | `webrtcManager.ts#L63` | Remove `NEXT_PUBLIC_*` TURN; add `POST /api/ice` with ephemeral auth tokens. |
| **SEC-02** | Security | **CRITICAL** | `admin/reports/page.tsx#L37` | Replace plaintext password with Supabase Auth admin role JWT verification. |
| **SEC-03** | Security | **CRITICAL** | `room/[code]/page.tsx#L35` | Move stranger game logic to server-authoritative reducer with secret commit-reveal. |
| **PRIV-01**| Privacy | **CRITICAL** | `webrtcManager.ts#L120` | Default video to off/blurred until mutual ready confirmation; add blur toggle. |
| **SEC-04** | Security | **HIGH** | Database / RLS layer | Enforce strict RLS policies on all tables; restrict anon key permissions. |
| **SEC-05** | Security | **HIGH** | `roomStore.ts#L51` | Redis-backed rate limiting and exponential backoff on room code guesses. |
| **REL-01** | Reliability| **HIGH** | `webrtcManager.ts#L280`| Add 15s presence disconnect grace timer and ICE restart automation. |
| **REL-02** | Reliability| **HIGH** | `matchmaker.ts#L80` | Atomic Redis Lua script pairing with mutual 5s ready checks. |
| **PRIV-02**| Privacy | **HIGH** | `AgeGateModal.tsx#L30` | Enforce 18+ age verification via session cookies before queue entry. |
| **PRIV-03**| Privacy | **HIGH** | `ReportModal.tsx#L60` | Persistent block lists in queue matching preventing re-pairing. |
| **PERF-01**| Performance| **HIGH** | `handDetector.ts#L42` | Lazy-load vision models only on camera start; cap to 15 FPS / 640x480. |
| **SEC-06** | Security | **MEDIUM** | `socketHandler.ts#L65` | Zod sanitization for display names and user identifiers. |
| **REL-03** | Reliability| **MEDIUM** | `VideoTiles.tsx#L125` | Unconditional camera track disposal on unmount in `useCameraStream`. |
| **REL-04** | Reliability| **MEDIUM** | `handDetector.ts#L145` | Visibilitychange listeners and Screen Wake Lock integration. |
| **PRIV-04**| Privacy | **MEDIUM** | `privacy/page.tsx#L1` | Add formal `/terms` and `/guidelines` compliance pages. |
| **PERF-02**| Performance| **MEDIUM** | `room/[code]/page.tsx#L1` | Split 1000+ line components into hooks and modular subcomponents. |

---

## Action Plan by Phase

1. **Phase 1: Foundations & Tests**:
   - Write Vitest tests for `/lib/game/engine.ts` (toss, scoring, wickets, ties, sequence ordering) and gesture recognition (`handClassifier.ts`).
   - Add gesture stability: 300ms / 5 consecutive frame hold debounce.
   - Add Zod validation schemas for all data crossing boundaries (`/lib/validations/messages.ts`) and environment validation (`/lib/env.ts`).
   - Refactor monolithic components into reusable subcomponents and hooks without behavioral regressions.
   - Configure GitHub Actions CI and Playwright smoke tests.

2. **Phase 2: Safety, Moderation & Privacy**:
   - 18+ session gate, Terms of Service (`/terms`), Community Guidelines (`/guidelines`).
   - Report and Block integration with Supabase RLS.
   - Video blur/off default until ready-check confirmation; blur opponent toggle; mic muted by default.
   - Migrate admin authentication to Supabase Auth admin claims.
   - Security headers (CSP, X-Frame-Options, Permissions-Policy) in `next.config.mjs`.

3. **Phase 3: Server-Authoritative Matchmaking & Moves**:
   - Ephemeral TURN generation endpoint `POST /api/ice`.
   - Redis atomic Lua queue pairing + Ably private channel match notifications.
   - Server-authoritative commit-and-reveal game resolution with 10s auto-pick and 15s disconnect forfeit.

4. **Phase 4: Unlimited Search & Endless Series**:
   - Indefinite queue search with optional "Play vs Computer while waiting".
   - 5s ready check, visibilitychange recovery, Screen Wake Lock.
   - Multi-round Endless Series with role alternation and series scoreboard.

5. **Phase 5: Production Polish**:
   - MediaPipe lazy loading and frame rate throttling.
   - Full keyboard accessibility and prefers-reduced-motion compliance.
   - Comprehensive deployment documentation and verification checklist.
