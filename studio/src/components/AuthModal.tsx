import React, { useState } from "react";
import { Sparkles, X, Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email above to receive a password reset link.");
      return;
    }
    setError(null);
    setLoadingReset(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email.");
    } finally {
      setLoadingReset(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }
    setError(null);
    setLoadingEmail(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      const msg =
        err?.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : err?.code === "auth/email-already-in-use"
          ? "This email is already registered. Please sign in."
          : err?.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : err?.message || "Authentication failed.";
      setError(msg);
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden p-6 sm:p-7 flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-12 rounded-2xl bg-blue-500/10 text-[#007aff] border border-blue-500/20 shadow-xs flex items-center justify-center mb-3">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {mode === "signin" ? "Sign in to AppAssets" : "Create your account"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Get <span className="font-semibold text-foreground">10 Free AI Copy Generations</span>,
            cloud presets, and realistic App Store preview tools.
          </p>
        </div>

        {/* Benefits List */}
        <div className="bg-muted/40 rounded-xl p-3 border border-border/60 mb-5 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span>AI Copywriter tailored to your app screenshots</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span>Instant App Store & Google Play ZIP packaging</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            <span>Promo Banners (1024×500) with 2x SSAA HD export</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={loadingGoogle || loadingEmail}
          className="w-full h-10 gap-3 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground shadow-xs cursor-pointer transition-all"
        >
          {loadingGoogle ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg className="size-4.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </Button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Or with email
          </span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9.5 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-9.5 text-sm"
                required
              />
            </div>
            {mode === "signin" ? (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loadingReset}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {loadingReset ? "Sending reset link..." : "Forgot password?"}
                </button>
              </div>
            ) : null}
          </div>

          {resetSent ? (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-center font-medium">
              Password reset link sent to <strong>{email}</strong>. Please check your inbox.
            </div>
          ) : null}

          {error ? (
            <div className="text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-center">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loadingGoogle || loadingEmail}
            className="w-full h-9.5 text-sm font-semibold rounded-xl bg-[#007aff] hover:bg-[#006ee6] active:bg-[#0062cc] text-white shadow-xs cursor-pointer transition-colors"
          >
            {loadingEmail ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Free Account"
            )}
          </Button>
        </form>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-4 text-xs text-muted-foreground">
          {mode === "signin" ? (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("signup");
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Sign up free
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("signin");
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
