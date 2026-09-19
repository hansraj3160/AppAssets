import { getSessionId } from "./session";

/**
 * Enhanced fetch wrapper that attaches the active session identifier
 * (via X-Session-ID header) to all API and manifest requests.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const sessionId = getSessionId();
  const headers = new Headers(init?.headers);

  if (!headers.has("X-Session-ID")) {
    headers.set("X-Session-ID", sessionId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
