import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthCallback = (user: any) => void | Promise<void>;

const mockState = vi.hoisted(() => ({
  authCallback: null as AuthCallback | null,
  profileData: null as Record<string, any> | null,
  currentUser: null as any,
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mockState.currentUser;
    },
  },
  db: { __mockDb: true },
  googleProvider: { providerId: "google.com" },
}));

vi.mock("@/lib/analytics", () => ({
  setUserProperties: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSessionId: vi.fn(() => "guest_test"),
  setAuthSession: vi.fn((uid: string | null) => (uid ? `user_${uid}` : "guest_test")),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth: any, cb: AuthCallback) => {
    mockState.authCallback = cb;
    return vi.fn();
  }),
  signInWithPopup: vi.fn(async () => ({ user: mockState.currentUser })),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: mockState.currentUser })),
  createUserWithEmailAndPassword: vi.fn(async () => ({ user: mockState.currentUser })),
  sendEmailVerification: vi.fn(async () => undefined),
  signOut: vi.fn(async () => {
    mockState.currentUser = null;
    await mockState.authCallback?.(null);
  }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: any, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(async () => ({
    exists: () => mockState.profileData !== null,
    data: () => mockState.profileData,
  })),
  setDoc: vi.fn(async (_ref: any, data: Record<string, any>) => {
    mockState.profileData = { ...data };
  }),
  updateDoc: vi.fn(async (_ref: any, patch: Record<string, any>) => {
    mockState.profileData = { ...(mockState.profileData ?? {}), ...patch };
  }),
  onSnapshot: vi.fn(() => vi.fn()),
  runTransaction: vi.fn(async (_db: any, fn: (tx: any) => Promise<any>) => {
    const tx = {
      get: async () => ({
        exists: () => mockState.profileData !== null,
        data: () => mockState.profileData,
      }),
      set: (_ref: any, data: Record<string, any>) => {
        mockState.profileData = { ...data };
      },
      update: (_ref: any, patch: Record<string, any>) => {
        mockState.profileData = { ...(mockState.profileData ?? {}), ...patch };
      },
    };
    return fn(tx);
  }),
}));

import { AuthProvider, useAuth } from "./AuthContext";

function AuthHarness() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(auth.loading)}</div>
      <div data-testid="uid">{auth.user?.uid ?? "none"}</div>
      <div data-testid="session">{auth.sessionId}</div>
      <div data-testid="is-pro">{String(auth.isPro)}</div>
      <div data-testid="verified">{String(auth.isEmailVerified)}</div>
      <div data-testid="credits">{auth.aiCreditsRemaining}</div>
      <div data-testid="auth-modal">{String(auth.isAuthModalOpen)}</div>
      <div data-testid="upgrade-modal">{String(auth.isUpgradeModalOpen)}</div>
      <button type="button" onClick={auth.openAuthModal}>
        Open Auth
      </button>
      <button type="button" onClick={auth.closeAuthModal}>
        Close Auth
      </button>
      <button type="button" onClick={auth.openUpgradeModal}>
        Open Upgrade
      </button>
      <button type="button" onClick={auth.closeUpgradeModal}>
        Close Upgrade
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.consumeAiCredit();
        }}
      >
        Consume Credit
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.refundAiCredit();
        }}
      >
        Refund Credit
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.toggleProPlan();
        }}
      >
        Toggle Pro
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.signOutUser();
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    mockState.authCallback = null;
    mockState.profileData = null;
    mockState.currentUser = null;
    vi.clearAllMocks();
  });

  it("throws when useAuth is called outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AuthHarness />)).toThrow("useAuth must be used within an AuthProvider");
    spy.mockRestore();
  });

  it("handles signed-out state, modal toggles, and prompts auth modal when consuming credits signed out", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      await mockState.authCallback?.(null);
    });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("uid")).toHaveTextContent("none");
    expect(screen.getByTestId("credits")).toHaveTextContent("0");
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("false");

    await user.click(screen.getByRole("button", { name: "Consume Credit" }));
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "Close Auth" }));
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("false");

    await user.click(screen.getByRole("button", { name: "Open Upgrade" }));
    expect(screen.getByTestId("upgrade-modal")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Close Upgrade" }));
    expect(screen.getByTestId("upgrade-modal")).toHaveTextContent("false");
  });

  it("hydrates Firestore profile, consumes and refunds AI credits, toggles Pro, and signs out cleanly", async () => {
    const user = userEvent.setup();
    mockState.profileData = {
      uid: "u-123",
      email: "dev@appassets.io",
      displayName: "Dev",
      photoURL: null,
      plan: "free",
      isPro: false,
      aiCreditsUsed: 3,
      aiCreditsLimit: 10,
      createdAt: "2026-11-27T00:00:00.000Z",
    };
    mockState.currentUser = {
      uid: "u-123",
      email: "dev@appassets.io",
      displayName: "Dev",
      photoURL: null,
      emailVerified: true,
      providerData: [{ providerId: "password" }],
    };

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await act(async () => {
      await mockState.authCallback?.(mockState.currentUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId("uid")).toHaveTextContent("u-123");
      expect(screen.getByTestId("session")).toHaveTextContent("user_u-123");
      expect(screen.getByTestId("verified")).toHaveTextContent("true");
      expect(screen.getByTestId("credits")).toHaveTextContent("7");
    });

    await user.click(screen.getByRole("button", { name: "Consume Credit" }));
    await waitFor(() => {
      expect(screen.getByTestId("credits")).toHaveTextContent("6");
    });

    await user.click(screen.getByRole("button", { name: "Refund Credit" }));
    await waitFor(() => {
      expect(screen.getByTestId("credits")).toHaveTextContent("7");
    });

    await user.click(screen.getByRole("button", { name: "Toggle Pro" }));
    await waitFor(() => {
      expect(screen.getByTestId("is-pro")).toHaveTextContent("true");
      expect(screen.getByTestId("credits")).toHaveTextContent("9999");
    });

    await user.click(screen.getByRole("button", { name: "Sign Out" }));
    await waitFor(() => {
      expect(screen.getByTestId("uid")).toHaveTextContent("none");
      expect(screen.getByTestId("is-pro")).toHaveTextContent("false");
    });
  });
});
