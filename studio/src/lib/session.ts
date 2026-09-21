/**
 * Session management for multi-tenant AppAssets Studio workspaces.
 *
 * Each browser / user receives a unique session ID:
 * - If logged in with Firebase Auth, uses `uid_${user.uid}`.
 * - For guest visitors, generates and stores a persistent `guest_${uuid}` in localStorage and cookies.
 *
 * The cookie `appassets_session_id` ensures that native browser requests
 * (e.g. <img src="/screenshots/..."> or /store.json) automatically carry the session ID.
 */

const STORAGE_KEY = "appassets_session_id";
const COOKIE_NAME = "appassets_session_id";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: cookie needed for browser media requests
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "default";

  // 1. Check existing localStorage
  let sid = localStorage.getItem(STORAGE_KEY);

  // 2. Check existing cookie fallback
  if (!sid) {
    sid = getCookie(COOKIE_NAME);
  }

  // 3. Generate a new guest session if not present or default
  if (!sid || sid.trim().length === 0 || sid === "default") {
    sid = `guest_${crypto.randomUUID()}`;
  }

  // Sanitize session id: alphanumeric and hyphens/underscores only
  sid = sid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

  // Ensure both localStorage and cookie are in sync
  try {
    localStorage.setItem(STORAGE_KEY, sid);
    setCookie(COOKIE_NAME, sid);
  } catch {}

  return sid;
}

/**
 * Bind session to an authenticated user's UID or switch session.
 *
 * - When `uid` is present (logged in), binds to `uid_${uid}`.
 * - When `uid` is null (guest or unauthenticated), preserves any existing guest session
 *   so that page reloads or auth initialization don't destroy the user's workspace.
 *   Only generates a fresh guest session if transitioning from an authenticated user
 *   (logging out) or if no session exists yet.
 */
export function setAuthSession(uid: string | null): string {
  if (typeof window === "undefined") return "default";

  let sid = localStorage.getItem(STORAGE_KEY) || getCookie(COOKIE_NAME);

  if (uid) {
    sid = `uid_${uid}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  } else {
    // If unauthenticated, PRESERVE any active guest session!
    // Never reset a guest's workspace on page reload or when Firebase Auth initializes.
    if (!sid || sid.trim().length === 0 || sid === "default" || sid.startsWith("uid_")) {
      sid = `guest_${crypto.randomUUID()}`;
    }
  }

  sid = sid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

  try {
    localStorage.setItem(STORAGE_KEY, sid);
    setCookie(COOKIE_NAME, sid);
  } catch {}

  return sid;
}
