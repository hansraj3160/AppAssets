import { beforeEach, describe, expect, test } from "bun:test";
import { getSessionId, setAuthSession } from "../studio/src/lib/session.ts";

describe("session management and workspace continuity", () => {
  let mockStorage: Record<string, string> = {};
  let mockCookie = "";

  beforeEach(() => {
    mockStorage = {};
    mockCookie = "";

    // Mock browser window, document, and localStorage
    (globalThis as any).window = {};
    (globalThis as any).document = {
      get cookie() {
        return mockCookie;
      },
      set cookie(val: string) {
        const parts = val.split(";")[0]!;
        const [k, v] = parts.split("=");
        if (k && v !== undefined) {
          mockCookie = `${k.trim()}=${v.trim()}`;
        }
      },
    };
    (globalThis as any).localStorage = {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        mockStorage = {};
      },
    };
  });

  test("generates and persists guest session if none exists", () => {
    const sid1 = getSessionId();
    expect(sid1).toStartWith("guest_");
    expect(mockStorage.appassets_session_id).toBe(sid1);
    expect(mockCookie).toContain(`appassets_session_id=${sid1}`);

    const sid2 = getSessionId();
    expect(sid2).toBe(sid1);
  });

  test("setAuthSession(null) preserves existing guest session across auth initialization or reload", () => {
    // 1. Initial guest visit
    const guestSid = getSessionId();
    expect(guestSid).toStartWith("guest_");

    // 2. Firebase onAuthStateChanged fires with currentUser = null
    const resultSid = setAuthSession(null);
    expect(resultSid).toBe(guestSid);
    expect(mockStorage.appassets_session_id).toBe(guestSid);
    expect(mockCookie).toContain(`appassets_session_id=${guestSid}`);

    // 3. User reloads or triggers another auth state check
    const reloadSid = setAuthSession(null);
    expect(reloadSid).toBe(guestSid);
  });

  test("setAuthSession(uid) sets uid session when user signs in", () => {
    const guestSid = getSessionId();
    expect(guestSid).toStartWith("guest_");

    const userSid = setAuthSession("firebase_user_123");
    expect(userSid).toBe("uid_firebase_user_123");
    expect(mockStorage.appassets_session_id).toBe("uid_firebase_user_123");
    expect(mockCookie).toContain("appassets_session_id=uid_firebase_user_123");
  });

  test("setAuthSession(null) switches to a new guest session only when explicitly signing out from uid", () => {
    // 1. User is signed in
    setAuthSession("firebase_user_123");
    expect(mockStorage.appassets_session_id).toBe("uid_firebase_user_123");

    // 2. User signs out
    const newGuestSid = setAuthSession(null);
    expect(newGuestSid).toStartWith("guest_");
    expect(newGuestSid).not.toBe("uid_firebase_user_123");
    expect(mockStorage.appassets_session_id).toBe(newGuestSid);

    // 3. Next auth state check retains this new guest session
    const retainedSid = setAuthSession(null);
    expect(retainedSid).toBe(newGuestSid);
  });

  test("sanitizes invalid characters in session ID", () => {
    mockStorage.appassets_session_id = "guest_evil/../../hack!@#$";
    const sid = getSessionId();
    expect(sid).toBe("guest_evilhack");
    expect(mockStorage.appassets_session_id).toBe("guest_evilhack");
  });

  test("replaces 'default' session with unique guest session in browser", () => {
    mockStorage.appassets_session_id = "default";
    const sid = getSessionId();
    expect(sid).toStartWith("guest_");
    expect(sid).not.toBe("default");
  });
});
