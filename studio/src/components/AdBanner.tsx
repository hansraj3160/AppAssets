import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export interface AdBannerProps {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
  variant?: "sidebar" | "banner" | "modal";
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function AdBanner({
  slot,
  format = "auto",
  className = "",
  variant = "sidebar",
}: AdBannerProps) {
  const { isPro, user, openAuthModal, openUpgradeModal } = useAuth();
  const [adDismissed, setAdDismissed] = useState(false);
  const [isAdBlockActive, setIsAdBlockActive] = useState(false);
  const adRef = useRef<HTMLModElement | null>(null);

  // Read AdSense Client and Slot IDs from Vite env variables
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || "";
  const effectiveSlot =
    slot ||
    (variant === "sidebar"
      ? import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT
      : import.meta.env.VITE_ADSENSE_BOTTOM_SLOT) ||
    "";

  // If the user is a Pro subscriber, completely suppress all ads & tracking scripts
  if (isPro) {
    return null;
  }

  // If user temporarily dismissed this slot in the current session
  if (adDismissed) {
    return null;
  }

  const isConfiguredAdSense =
    Boolean(clientId) &&
    clientId.startsWith("ca-pub-") &&
    !clientId.includes("xxxxxxxx");

  // Load Google AdSense script only once when valid credentials exist
  useEffect(() => {
    if (!isConfiguredAdSense) return;

    const existingScript = document.querySelector(
      `script[src*="pagead2.googlesyndication.com"]`
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = "anonymous";
      script.onerror = () => setIsAdBlockActive(true);
      document.head.appendChild(script);
    }

    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.warn("AdSense push error or ad blocker detected:", e);
      setIsAdBlockActive(true);
    }
  }, [isConfiguredAdSense, clientId]);

  const handleGoPro = () => {
    if (!user) {
      openAuthModal();
    } else {
      openUpgradeModal();
    }
  };

  // 1. If Google AdSense is fully configured and ad blocker isn't active, render official AdSense tag
  if (isConfiguredAdSense && !isAdBlockActive) {
    return (
      <div className={`relative flex flex-col items-center overflow-hidden rounded-xl border border-border/70 bg-card/60 p-2 my-2 ${className}`}>
        <div className="flex w-full items-center justify-between px-1 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          <span>Sponsored</span>
          <button
            onClick={handleGoPro}
            className="text-primary hover:underline flex items-center gap-1 cursor-pointer lowercase first-letter:uppercase"
          >
            <Sparkles className="size-2.5 text-amber-500 fill-amber-500" />
            <span>Ad-free with Pro</span>
          </button>
        </div>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minWidth: 200, minHeight: variant === "sidebar" ? 180 : 60 }}
          data-ad-client={clientId}
          data-ad-slot={effectiveSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // 2. Realistic, sleek Promotional Ad Card (Fallback for dev, demo & free users without AdSense key)
  if (variant === "sidebar") {
    return (
      <div
        className={`group relative mx-3 my-3 flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-3.5 shadow-xs transition-all hover:border-border text-foreground ${className}`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-2">
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-muted-foreground">
            Advertisement
          </span>
          <button
            type="button"
            onClick={() => setAdDismissed(true)}
            className="text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors p-0.5"
            title="Hide for this session"
            aria-label="Hide advertisement"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Ad Content */}
        <div className="flex items-start gap-2.5">
          <div className="size-8 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Sparkles className="size-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold leading-tight text-foreground">
              Remove Ads & Go Pro
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
              Get a 100% ad-free studio, unlimited AI copywriter generations, and 4K exports.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">From $9/mo</span>
          <Button
            size="sm"
            onClick={handleGoPro}
            className="h-7 text-xs px-2.5 gap-1.5 bg-[#007aff] hover:bg-[#006ee6] active:bg-[#0062cc] text-white cursor-pointer shadow-2xs rounded-lg font-medium"
          >
            <Sparkles className="size-3" />
            <span>Go Ad-Free</span>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Horizontal Banner variant (for canvas dock or footer)
  return (
    <div
      className={`group relative flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-card px-4 py-2.5 shadow-xs text-foreground ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-muted-foreground shrink-0">
          Ad
        </span>
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
            <Sparkles className="size-3" />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tired of ads?</span> Upgrade to Pro for an ad-free workflow & unlimited AI copy.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleGoPro}
          className="h-7 text-xs px-3 gap-1.5 bg-[#007aff] hover:bg-[#006ee6] active:bg-[#0062cc] text-white cursor-pointer shadow-2xs rounded-lg font-medium"
        >
          <Sparkles className="size-3" />
          <span>Upgrade to Pro</span>
        </Button>
        <button
          type="button"
          onClick={() => setAdDismissed(true)}
          className="text-muted-foreground/60 hover:text-foreground cursor-pointer p-1"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
