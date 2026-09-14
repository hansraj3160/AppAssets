import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { trackUpgradeEvent } from "@/lib/analytics";

export function UpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal, isPro, toggleProPlan, user, openAuthModal } =
    useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isUpgradeModalOpen) {
      trackUpgradeEvent("pricing_viewed", {
        plan: "pro",
        price: 9.0,
        currency: "USD",
      });
    }
  }, [isUpgradeModalOpen]);

  if (!isUpgradeModalOpen) return null;

  const handleAction = async () => {
    trackUpgradeEvent("upgrade_clicked", {
      plan: "pro",
      price: 9.0,
      currency: "USD",
      action: isPro ? "downgrade" : "upgrade",
    });

    if (!user) {
      closeUpgradeModal();
      openAuthModal();
      return;
    }

    if (!isPro) {
      trackUpgradeEvent("begin_checkout", {
        plan: "pro",
        price: 9.0,
        currency: "USD",
      });
    }

    setLoading(true);
    try {
      await toggleProPlan();
      if (!isPro) {
        trackUpgradeEvent("purchase", {
          plan: "pro",
          price: 9.0,
          currency: "USD",
          transaction_id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        });
      }
      closeUpgradeModal();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) closeUpgradeModal();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeUpgradeModal();
      }}
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col text-foreground animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeUpgradeModal}
          className="absolute top-5 right-5 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 px-3 py-1 text-xs font-semibold text-[#FF6B00] mb-3">
            <Sparkles className="size-3 fill-current text-[#FFB21A]" />
            <span>AppAssets Studio Pro</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isPro ? "You are on AppAssets Pro" : "Upgrade to Pro & Go 100% Ad-Free"}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md">
            {isPro
              ? "You have unlimited AI generations, priority exports, and a completely ad-free studio experience."
              : "Support independent developer tooling, unlock unlimited AI copywriting, and remove all advertisements."}
          </p>
        </div>

        {/* Plan Cards Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Free Plan */}
          <div
            className={`rounded-2xl border p-4.5 flex flex-col justify-between ${!isPro ? "border-border/90 bg-muted/20" : "border-border/60 bg-muted/10 opacity-75"}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Free Plan
                </span>
                {!isPro && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-foreground">$0</span>
                <span className="text-xs text-muted-foreground">/ forever</span>
              </div>
              <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-foreground shrink-0" />
                  <span>10 Free AI Copy generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-foreground shrink-0" />
                  <span>Standard store ZIP export</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground/80">
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0 mx-1" />
                  <span>Contains Google Ads</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div
            className={`relative rounded-2xl border-2 p-4.5 flex flex-col justify-between overflow-hidden ${isPro ? "border-[#FF6B00] bg-[#FF6B00]/5 shadow-xs" : "border-[#FF6B00]/80 bg-[#FF6B00]/5 shadow-xs"}`}
          >
            <div className="absolute top-0 right-0 bg-[#FF6B00] text-white px-2.5 py-0.5 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider">
              Popular
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00]">
                  Pro Member
                </span>
                {isPro && (
                  <span className="rounded-md bg-[#FF6B00] text-white px-2 py-0.5 text-[10px] font-semibold">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-foreground">$9</span>
                <span className="text-xs text-muted-foreground">/ month</span>
              </div>
              <ul className="mt-4 space-y-2.5 text-xs text-foreground font-medium">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>100% Ad-Free</strong> Studio
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Unlimited</strong> AI Copywriting
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>High-resolution 4K exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Priority rendering pipeline</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={loading}
            onClick={handleAction}
            className={`w-full gap-2 text-sm font-semibold shadow-xs cursor-pointer h-11 rounded-xl transition-all ${
              isPro
                ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                : "bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs shadow-[#FF6B00]/20"
            }`}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4 fill-current text-[#FFB21A]" />
            )}
            <span>
              {isPro ? "Downgrade to Free Plan (Test Ads)" : "Upgrade to Pro (Instant Ad-Free)"}
            </span>
          </Button>

          <p className="text-center text-[11px] text-muted-foreground mt-1">
            Cancel anytime • Instant activation • No hidden fees
          </p>
        </div>
      </div>
    </div>
  );
}
