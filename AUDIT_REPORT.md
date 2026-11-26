# AppAssets Studio — Security & Bug Flow Audit Report

**Date:** 2026-11-25  
**Scope:** Backend (`src/studio-server.ts`), Firebase (`firestore.rules`, `AuthContext.tsx`), and Frontend Studio (`studio/src/`)

---

## Executive Summary

| Severity | Count | Category |
| :--- | :---: | :--- |
| **P0 (Critical)** | 4 | Unauthenticated AI API, Free Pro/Verification Bypass, Session Spoofing, Path Traversal |
| **P1 (High)** | 3 | Global Export Lock, Unbounded Body Memory DoS, Client-Side Credit Race |
| **P2 (Medium)** | 4 | Auth Workspace Sync Bug, Stale History State, Shallow User Clone, Page Reload Fallback |

---

## 1. Critical Security & Monetization Bugs (P0)

### P0-1: Unauthenticated `/api/ai/generate-copy` Endpoint
- **Location:** `src/studio-server.ts` (`aiCopyHandler`, lines 2742–3092)
- **Root Cause:** The backend endpoint only checks an in-memory IP rate limiter (`10` requests per `10` minutes) and does **not** verify any Firebase ID token, `emailVerified` status, or user credit balance.
- **Bug Flow:**
  1. The frontend (`studio/src/components/AiCopyModal.tsx`) gates AI copy generation behind login, email verification, and 10 free credits.
  2. An attacker or script bypasses the UI and sends a direct `POST /api/ai/generate-copy` request with `sceneId` (and optional `imageBase64`).
  3. The server executes the Gemini Vision API call without authentication or credit deduction.
- **Recommended Fix:**
  - Require `Authorization: Bearer <Firebase ID Token>` on `/api/ai/generate-copy`.
  - Verify the token with Firebase Admin SDK (`email_verified === true`) and atomically check/decrement credits in Firestore on the server before calling Gemini.

---

### P0-2: Free Pro Plan & Email Verification Bypass
- **Locations:**
  - `firestore.rules` (lines 4–6)
  - `studio/src/components/UpgradeModal.tsx` (lines 24–61)
  - `studio/src/context/AuthContext.tsx` (lines 183–187, 226–246)
- **Root Cause:**
  1. `firestore.rules` grants full client write access to the user document: `allow read, write: if request.auth != null && request.auth.uid == userId;`.
  2. `UpgradeModal.tsx` calls `toggleProPlan()`, which immediately sets `isPro: true, plan: "pro_monthly"` in Firestore with no payment verification.
  3. `AuthContext.tsx` sets `isEmailVerified = Boolean(user?.emailVerified || ... || profile?.isPro)`.
- **Bug Flow:**
  1. A user signs up with a fake/unverified email (`user.emailVerified === false`).
  2. Free AI credits are locked at `0`.
  3. The user opens the Upgrade modal and clicks **"Upgrade to Pro (Instant Ad-Free)"** (or writes `{ isPro: true }` directly to Firestore).
  4. `profile.isPro` becomes `true`, which immediately unlocks unlimited AI credits, removes ads, and bypasses email verification.
- **Recommended Fix:**
  - Restrict `firestore.rules` so clients **cannot** modify `isPro`, `plan`, `aiCreditsUsed`, or `aiCreditsLimit` (updates must happen only via trusted backend/Cloud Functions webhook after Stripe/payment verification).
  - Remove `toggleProPlan()` from production builds in `UpgradeModal.tsx` / `AuthContext.tsx`.
  - Remove `|| profile?.isPro` from `isEmailVerified` check.

---

### P0-3: Cross-Tenant Workspace Hijacking (`X-Session-ID` Spoofing)
- **Locations:**
  - `src/studio-server.ts` (`getSessionIdFromRequest`, lines 124–158; `resolveWorkspacePaths`, lines 164–178)
  - `studio/src/lib/session.ts` (`setAuthSession`, lines 65–88)
- **Root Cause:** The server trusts `X-Session-ID`, cookie `appassets_session_id`, or `?sessionId=` directly to resolve `workspaces/<sessionId>` without verifying ownership.
- **Bug Flow:**
  1. Authenticated users have workspaces at `workspaces/uid_<firebaseUid>`.
  2. Any requester who knows or guesses a `uid_<firebaseUid>` (or `guest_<uuid>`) sends `X-Session-ID: uid_<targetUid>`.
  3. The server allows reading (`/api/design`, `/store.json`), modifying (`PUT /api/design`, `/api/import`), exporting (`/api/export`), or wiping (`POST /api/delete-all`) the victim's workspace.
- **Recommended Fix:**
  - Require a verified Firebase ID token whenever `sessionId` starts with `uid_`, and ensure `sessionId === "uid_" + decodedToken.uid`.

---

### P0-4: Path Traversal via `sceneId`, `device`, and `locale`
- **Locations:** `src/studio-server.ts`
  - `replaceCaptureHandler` (line 896): `join(rawDir, `${sceneId}.png`)`
  - `deleteHandler` (line 1682): `join(rawDir, `${sceneId}.png`)`
  - `singleExportHandler` (line 2031) & `selectedExportZipHandler` (line 2210): `join(paths.outDir, "screenshots", device, locale)`
- **Root Cause:** `sceneId`, `device`, and `locale` are concatenated/joined into filesystem paths without rejecting `..`, `/`, or `\`.
- **Bug Flow:**
  1. Sending `sceneId: "../../target"` to `POST /api/delete` invokes `rm(rawFile, { force: true })` outside `rawDir`.
  2. Sending `sceneId: "../../target"` to `POST /api/replace-capture` writes a `.png` file outside `rawDir`.
- **Recommended Fix:**
  - Validate `sceneId`, `device`, and `locale` against a strict safe character allowlist (e.g., `/^[a-zA-Z0-9._-]+$/`) and verify resolved paths stay inside the intended directory (`resolve(target).startsWith(resolve(baseDir) + sep)`).

---

## 2. High-Severity Backend & Concurrency Bugs (P1)

### P1-1: Global Export Lock Blocks All Concurrent Users
- **Location:** `src/studio-server.ts` (`exportHandler`, lines 419–455)
- **Root Cause:** `let busy = false;` is a single module-level boolean shared across all sessions.
- **Bug Flow:**
  1. User A triggers `POST /api/export`. `busy` becomes `true`.
  2. User B (in a completely separate workspace) triggers `POST /api/export` and receives `409 An export is already running.` until User A's export finishes.
- **Recommended Fix:** Replace `let busy = false` with a per-session lock (`const busySessions = new Set<string>()`).

---

### P1-2: Unbounded Request Body Buffering (`readBody` Memory DoS)
- **Location:** `src/studio-server.ts` (`readBody`, lines 268–274)
- **Root Cause:** `readBody(req)` appends all incoming chunks into a string with no maximum byte limit.
- **Bug Flow:** A large or malicious POST request to any JSON endpoint can exhaust server memory and crash the process.
- **Recommended Fix:** Enforce a configurable `maxBytes` limit in `readBody` (e.g., `1 MB` for design/AI/delete endpoints, `50 MB` for image import endpoints) and return `413 Payload Too Large` when exceeded.

---

### P1-3: Client-Side Credit Deduction Race & Silent Bypass
- **Locations:**
  - `studio/src/components/AiCopyModal.tsx` (lines 242–244)
  - `studio/src/context/AuthContext.tsx` (lines 219–222)
- **Root Cause:**
  1. `consumeAiCredit()` runs *after* `/api/ai/generate-copy` succeeds.
  2. Its `catch` block returns `true` (`"Allow if Firestore update failed locally"`).
- **Bug Flow:** Concurrent requests or blocked Firestore requests allow generating AI copy without decrementing `aiCreditsUsed`.
- **Recommended Fix:** Move credit validation and deduction to the backend `/api/ai/generate-copy` handler inside a Firestore transaction.

---

## 3. Frontend State & UX Flow Bugs (P2)

### P2-1: Auth Login/Logout Does Not Reload Studio Workspace
- **Locations:**
  - `studio/src/context/AuthContext.tsx` (lines 66–68)
  - `studio/src/App.tsx` (`AppContent`, lines 196–207)
- **Root Cause:** `AuthContext` updates `setAuthSession(...)` on `onAuthStateChanged`, but `AppContent` only runs `refresh()` once on mount (`useEffect(() => { refresh(); }, [refresh])`).
- **Bug Flow:**
  1. User opens `/studio` as a guest (`guest_xxx`) and edits/imports screenshots.
  2. User signs in -> `localStorage`/cookie switches to `uid_yyy`.
  3. UI continues showing `guest_xxx`'s loaded manifest and design state.
  4. Debounced `saveDesign()` fires and overwrites `uid_yyy`'s `appassets.design.json` with the guest workspace's design.
  5. Same issue occurs on Sign Out (logged-in user's screenshots remain visible in UI until manual reload).
- **Recommended Fix:** Trigger `refresh()` in `AppContent` whenever the active session ID (`user?.uid ?? null`) changes, and key `<Loaded>` by the active session ID.

---

### P2-2: `Loaded` History State Stale After `onRefresh()`
- **Locations:**
  - `studio/src/App.tsx` (lines 366–373, 446–469)
  - `studio/src/lib/useHistory.ts` (lines 17–22)
- **Root Cause:** `<Loaded>` has no `key` prop tied to session or `manifest.generatedAt`, and `useHistory` only reads `initial()` on first mount.
- **Bug Flow:** After importing, deleting, or refreshing manifest/design via `onRefresh()`, `saved` props update, but `useHistory`'s internal `state` (`order`, `copy`, `sceneLayouts`, etc.) is not re-synced unless manually mutated.
- **Recommended Fix:** Key `<Loaded>` appropriately (or sync non-dirty fields / reset history on workspace change).

---

### P2-3: `reloadUserVerification()` Strips Firebase `User` Prototype Methods
- **Location:** `studio/src/context/AuthContext.tsx` (line 171)
- **Root Cause:** `setUser(updated ? { ...updated } : null)` shallow-spreads a Firebase `User` class instance into a plain object, stripping methods like `getIdToken()`, `reload()`, etc.
- **Recommended Fix:** Store the `User` instance directly or pair it with a lightweight `authVersion` counter state to trigger re-renders without cloning the `User` object.

---

### P2-4: `ImportButton` Full Page Reload Fallback
- **Location:** `studio/src/components/ImportButton.tsx` (lines 105–113)
- **Root Cause:** When `onSuccess` is omitted, `ImportButton` falls back to `window.location.reload()`, causing a full white-screen reload.
- **Recommended Fix:** Always pass `onSuccess` from callers or trigger workspace refresh via callback/context instead of `window.location.reload()`.
