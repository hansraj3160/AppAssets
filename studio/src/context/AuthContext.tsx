import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { setUserProperties } from "@/lib/analytics";
import { auth, db, googleProvider } from "@/lib/firebase";
import { getSessionId, setAuthSession } from "@/lib/session";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: "free" | "pro_monthly" | "pro_annual";
  isPro: boolean;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
  createdAt: string;
}

const DEFAULT_FREE_CREDITS = 10;

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionId: string;
  authVersion: number;
  isPro: boolean;
  isEmailVerified: boolean;
  aiCreditsRemaining: number;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<User | null>;
  signOutUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUserVerification: () => Promise<boolean>;
  consumeAiCredit: () => Promise<boolean>;
  refundAiCredit: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
  toggleProPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>(() => getSessionId());
  const [authVersion, setAuthVersion] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const creditQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const runCreditOp = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = creditQueueRef.current.then(fn, fn);
    creditQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      setUser(currentUser);
      setAuthVersion((v) => v + 1);
      const nextSessionId = setAuthSession(currentUser ? currentUser.uid : null);
      setSessionId(nextSessionId);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
              photoURL: currentUser.photoURL,
              plan: "free",
              isPro: false,
              aiCreditsUsed: 0,
              aiCreditsLimit: DEFAULT_FREE_CREDITS,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(snap.data() as UserProfile);
          }
        } catch (err) {
          console.warn("Could not read user profile from Firestore, using fallback:", err);
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || "User",
            photoURL: currentUser.photoURL,
            plan: "free",
            isPro: false,
            aiCreditsUsed: 0,
            aiCreditsLimit: DEFAULT_FREE_CREDITS,
            createdAt: new Date().toISOString(),
          });
        }

        // Listen for live updates (e.g. plan change, credits used)
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setUserProperties({ is_pro: profile.isPro, plan: profile.plan });
    } else {
      setUserProperties({ is_pro: false, plan: "free" });
    }
  }, [profile]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        throw err;
      }
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    setIsAuthModalOpen(false);
  };

  const signUpWithEmail = async (email: string, pass: string): Promise<User | null> => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      try {
        await sendEmailVerification(cred.user);
      } catch (err) {
        console.warn("Could not dispatch verification email on signup:", err);
      }
    }
    return cred.user ?? null;
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUserVerification = async (): Promise<boolean> => {
    if (auth.currentUser) {
      if (typeof auth.currentUser.reload === "function") {
        await auth.currentUser.reload();
      }
      const updated = auth.currentUser;
      setUser(updated);
      setAuthVersion((v) => v + 1);
      return Boolean(updated?.emailVerified);
    }
    return false;
  };

  const signOutUser = async () => {
    await signOut(auth);
    setProfile(null);
  };

  // Google OAuth accounts are pre-verified; email/pass users must verify email to unlock free credits
  const isEmailVerified = Boolean(
    user?.emailVerified ||
      user?.providerData?.some((p) => p.providerId === "google.com") ||
      profile?.isPro,
  );

  const isPro = profile?.isPro ?? false;
  const aiCreditsRemaining = isPro
    ? 9999
    : !isEmailVerified
      ? 0
      : Math.max(
          0,
          (profile?.aiCreditsLimit ?? DEFAULT_FREE_CREDITS) - (profile?.aiCreditsUsed ?? 0),
        );

  const consumeAiCredit = async (): Promise<boolean> => {
    if (isPro) return true;
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (!isEmailVerified) {
      setIsAuthModalOpen(true);
      return false;
    }

    return runCreditOp(async () => {
      const userRef = doc(db, "users", user.uid);
      try {
        const result = await runTransaction(db, async (tx) => {
          const snap = await tx.get(userRef);
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split("@")[0] || "User",
              photoURL: user.photoURL,
              plan: "free",
              isPro: false,
              aiCreditsUsed: 1,
              aiCreditsLimit: DEFAULT_FREE_CREDITS,
              createdAt: new Date().toISOString(),
            };
            tx.set(userRef, newProfile);
            return { ok: true, used: 1, limit: DEFAULT_FREE_CREDITS, isPro: false };
          }
          const data = snap.data() as UserProfile;
          if (data.isPro) {
            return { ok: true, used: data.aiCreditsUsed ?? 0, limit: data.aiCreditsLimit ?? DEFAULT_FREE_CREDITS, isPro: true };
          }
          const used = data.aiCreditsUsed ?? 0;
          const limit = data.aiCreditsLimit ?? DEFAULT_FREE_CREDITS;
          if (used >= limit) {
            return { ok: false, used, limit, isPro: false };
          }
          const nextUsed = used + 1;
          tx.update(userRef, { aiCreditsUsed: nextUsed });
          return { ok: true, used: nextUsed, limit, isPro: false };
        });

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                aiCreditsUsed: result.used,
                aiCreditsLimit: result.limit,
                isPro: result.isPro,
              }
            : null,
        );
        return result.ok;
      } catch (err) {
        console.error("Failed to consume AI credit in Firestore:", err);
        return false;
      }
    });
  };

  const refundAiCredit = async (): Promise<void> => {
    if (!user || isPro) return;
    await runCreditOp(async () => {
      const userRef = doc(db, "users", user.uid);
      try {
        const nextUsed = await runTransaction(db, async (tx) => {
          const snap = await tx.get(userRef);
          if (!snap.exists()) return null;
          const data = snap.data() as UserProfile;
          if (data.isPro) return data.aiCreditsUsed ?? 0;
          const used = data.aiCreditsUsed ?? 0;
          const updated = Math.max(0, used - 1);
          if (updated !== used) {
            tx.update(userRef, { aiCreditsUsed: updated });
          }
          return updated;
        });
        if (nextUsed !== null) {
          setProfile((prev) => (prev ? { ...prev, aiCreditsUsed: nextUsed } : null));
        }
      } catch (err) {
        console.error("Failed to refund AI credit in Firestore:", err);
      }
    });
  };

  const toggleProPlan = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const newIsPro = !isPro;
    const newPlan = newIsPro ? "pro_monthly" : "free";

    // Optimistic local update
    setProfile((prev) => (prev ? { ...prev, isPro: newIsPro, plan: newPlan } : null));

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isPro: newIsPro,
        plan: newPlan,
      });
    } catch (err) {
      console.error("Failed to update user pro plan in Firestore:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionId,
        authVersion,
        isPro,
        isEmailVerified,
        aiCreditsRemaining,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        sendVerificationEmail,
        reloadUserVerification,
        consumeAiCredit,
        refundAiCredit,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        isUpgradeModalOpen,
        openUpgradeModal: () => setIsUpgradeModalOpen(true),
        closeUpgradeModal: () => setIsUpgradeModalOpen(false),
        toggleProPlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
