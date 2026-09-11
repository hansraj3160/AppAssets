import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

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
  isPro: boolean;
  aiCreditsRemaining: number;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  consumeAiCredit: () => Promise<boolean>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
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

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
    setIsAuthModalOpen(false);
  };

  const signOutUser = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const isPro = profile?.isPro ?? false;
  const aiCreditsRemaining = isPro
    ? 9999
    : Math.max(0, (profile?.aiCreditsLimit ?? DEFAULT_FREE_CREDITS) - (profile?.aiCreditsUsed ?? 0));

  const consumeAiCredit = async (): Promise<boolean> => {
    if (isPro) return true;
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (aiCreditsRemaining <= 0) {
      return false;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        aiCreditsUsed: increment(1),
      });
      return true;
    } catch (err) {
      console.error("Failed to update credit usage in Firestore:", err);
      // Allow if Firestore update failed locally so user experience isn't blocked
      return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isPro,
        aiCreditsRemaining,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        consumeAiCredit,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
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
