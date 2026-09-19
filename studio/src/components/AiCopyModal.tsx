import {
  AlertCircle,
  Check,
  Clock,
  Feather,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { trackAiCopyGenerated, trackToolOpened } from "../lib/analytics";
import type { AppInfo, StoreManifest } from "../manifest";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export interface AiSuggestion {
  tone: string;
  headline: string;
  subhead: string;
}

export interface AiCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId: string;
  sceneHeadline?: string;
  sceneSubhead?: string;
  device: string;
  locale: string;
  manifest?: StoreManifest;
  appInfo?: AppInfo;
  onApplyCopy: (sceneId: string, field: "headline" | "subhead", text: string) => void;
}

const TONES = [
  { id: "all", label: "All Tones", icon: Sparkles },
  { id: "punchy", label: "Punchy & Bold", icon: Zap },
  { id: "benefit", label: "Benefit-Driven", icon: TrendingUp },
  { id: "action", label: "Action-Oriented", icon: Target },
  { id: "minimalist", label: "Minimalist", icon: Feather },
];

export function AiCopyModal({
  isOpen,
  onClose,
  sceneId,
  sceneHeadline = "",
  sceneSubhead = "",
  device,
  locale,
  manifest,
  appInfo,
  onApplyCopy,
}: AiCopyModalProps) {
  const { user, isPro, aiCreditsRemaining, consumeAiCredit, openAuthModal } = useAuth();
  const [selectedTone, setSelectedTone] = useState("all");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenAnalysis, setScreenAnalysis] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const autoFetchedForRef = useRef<string | null>(null);

  const appName = appInfo?.name || manifest?.app?.name;
  const appCategory = appInfo?.category || manifest?.app?.category;
  const appDescription =
    appInfo?.description ||
    manifest?.app?.description?.[locale] ||
    manifest?.app?.description?.["en-US"] ||
    (manifest?.app?.description ? Object.values(manifest.app.description)[0] : undefined);

  // Countdown timer for rate-limit cooldown
  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (isOpen) {
      trackToolOpened("ai_copywriter", { scene_id: sceneId });
    }
  }, [isOpen, sceneId]);

  const fetchAiSuggestions = useCallback(
    async (overrideTone?: string) => {
      if (!user) {
        openAuthModal();
        return;
      }
      if (!isPro && aiCreditsRemaining <= 0) {
        setError(
          "You have reached your 10 free AI credits limit. Upgrade to Pro for unlimited AI copy generation.",
        );
        return;
      }

      setLoading(true);
      setError(null);
      setAppliedIndex(null);

      try {
        const res = await fetch("/api/ai/generate-copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneId,
            device,
            locale,
            tone: overrideTone ?? selectedTone,
            customPrompt: customPrompt.trim() || undefined,
            appContext:
              appName || appCategory || appDescription
                ? {
                    name: appName,
                    category: appCategory,
                    description: appDescription,
                  }
                : undefined,
          }),
        });

        let data: {
          ok?: boolean;
          error?: string;
          screenAnalysis?: string;
          suggestions?: AiSuggestion[];
          rateLimit?: { limit: number; remaining: number; resetTime: number };
          retryAfter?: number;
          limit?: number;
        } = {};
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text || `HTTP ${res.status} ${res.statusText}` };
        }

        if (data.rateLimit) {
          setRateLimit({
            limit: data.rateLimit.limit,
            remaining: data.rateLimit.remaining,
          });
        }

        if (res.status === 429) {
          setCooldownSeconds(data.retryAfter || 60);
          if (data.limit !== undefined) {
            setRateLimit({
              limit: data.limit,
              remaining: 0,
            });
          }
          throw new Error(
            data.error || "Rate limit reached. Please wait a moment before trying again.",
          );
        }

        if (!res.ok) {
          throw new Error(data.error || `Failed to generate AI copy (HTTP ${res.status})`);
        }

        // Successfully generated copy: deduct 1 AI credit for free plan users
        await consumeAiCredit();

        setCooldownSeconds(null);
        setScreenAnalysis(data.screenAnalysis || null);
        setSuggestions(data.suggestions || []);
        trackAiCopyGenerated({
          scene_id: sceneId,
          tone: overrideTone ?? selectedTone,
          char_count: data.suggestions?.[0]?.headline?.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      isPro,
      aiCreditsRemaining,
      consumeAiCredit,
      openAuthModal,
      sceneId,
      device,
      locale,
      selectedTone,
      customPrompt,
      appName,
      appCategory,
      appDescription,
    ],
  );

  // Auto-generate on open once per scene/device/locale only if user is logged in
  useEffect(() => {
    if (!isOpen) {
      autoFetchedForRef.current = null;
      return;
    }

    if (!user) {
      return;
    }

    const currentKey = `${sceneId}-${device}-${locale}`;
    if (autoFetchedForRef.current !== currentKey) {
      autoFetchedForRef.current = currentKey;
      setError(null);
      setSuggestions([]);
      setScreenAnalysis(null);
      fetchAiSuggestions();
    }
  }, [isOpen, user, sceneId, device, locale, fetchAiSuggestions]);

  const handleApplyBoth = (suggestion: AiSuggestion, index: number) => {
    onApplyCopy(sceneId, "headline", suggestion.headline);
    onApplyCopy(sceneId, "subhead", suggestion.subhead);
    setAppliedIndex(index);
    setTimeout(() => {
      onClose();
      setAppliedIndex(null);
    }, 250);
  };

  const handleApplyHeadlineOnly = (headline: string) => {
    onApplyCopy(sceneId, "headline", headline);
  };

  const handleApplySubheadOnly = (subhead: string) => {
    onApplyCopy(sceneId, "subhead", subhead);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Copy Assistant"
      className="animate-in fade-in fixed inset-0 z-50 flex duration-150 items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[85vh] max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-foreground">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25 shadow-xs">
              <Sparkles className="size-5 text-[#FFB21A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold leading-tight">AI Copy Assistant</h2>
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide">
                  GEMINI VISION
                </span>
                {user ? (
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide flex items-center gap-1 transition-colors ${
                      isPro
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                        : aiCreditsRemaining <= 2
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                    title={
                      isPro
                        ? "Pro Plan: Unlimited generations"
                        : `${aiCreditsRemaining} free credits left`
                    }
                  >
                    <Sparkles className="size-2.5 text-amber-500 fill-amber-500" />
                    <span>{isPro ? "PRO • Unlimited" : `${aiCreditsRemaining}/10 credits`}</span>
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="size-2.5" />
                    <span>Login Required</span>
                  </span>
                )}
                {rateLimit && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide flex items-center gap-1 bg-muted text-muted-foreground border border-border/60"
                    title="Fair-use rate limit quota"
                  >
                    <Shield className="size-2.5" />
                    <span>
                      {rateLimit.remaining}/{rateLimit.limit}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  Visual screen analysis & high-converting copy for{" "}
                  <span className="font-semibold text-foreground">"{sceneId}"</span> ({locale})
                </p>
                {appName ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
                    {appName}
                    {appCategory ? ` • ${appCategory}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tone Selector & Custom Input Bar (Only when user is signed in) */}
        {user ? (
          <div className="shrink-0 border-b border-border bg-background/60 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tone Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TONES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedTone === t.id;
                  const isPillDisabled =
                    loading ||
                    (cooldownSeconds !== null && cooldownSeconds > 0) ||
                    (!isPro && aiCreditsRemaining <= 0);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isPillDisabled}
                      onClick={() => {
                        setSelectedTone(t.id);
                        fetchAiSuggestions(t.id);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Re-generate Button with Cooldown & Credit state */}
              <Button
                size="sm"
                disabled={
                  loading ||
                  (cooldownSeconds !== null && cooldownSeconds > 0) ||
                  (!isPro && aiCreditsRemaining <= 0)
                }
                onClick={() => fetchAiSuggestions()}
                className="gap-1.5 cursor-pointer bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white shadow-xs shadow-[#FF6B00]/20 disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                <span>
                  {cooldownSeconds
                    ? `Wait ${cooldownSeconds}s`
                    : !isPro && aiCreditsRemaining <= 0
                      ? "0 Credits Left"
                      : "Regenerate"}
                </span>
              </Button>
            </div>

            {/* Optional Direction Input with 300-char limiter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={customPrompt}
                  maxLength={300}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchAiSuggestions();
                  }}
                  disabled={!isPro && aiCreditsRemaining <= 0}
                  placeholder="Optional direction (max 300 chars, e.g. 'Focus on zero fees and security')"
                  className="h-8 text-xs w-full bg-muted/40 pr-14"
                />
                {customPrompt.length > 200 ? (
                  <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-mono">
                    {customPrompt.length}/300
                  </span>
                ) : null}
              </div>
              {customPrompt ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAiSuggestions()}
                  disabled={
                    loading ||
                    (cooldownSeconds !== null && cooldownSeconds > 0) ||
                    (!isPro && aiCreditsRemaining <= 0)
                  }
                  className="h-8 text-xs cursor-pointer"
                >
                  Apply Direction
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {!user ? (
            <div className="flex flex-col items-center justify-center my-auto py-10 px-4 text-center max-w-md mx-auto animate-in fade-in">
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/25 shadow-sm mb-4">
                <Sparkles className="size-7 text-[#FFB21A]" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Sign In to Unlock AI Copywriter
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Analyze your uploaded app screenshots to generate high-converting App Store & Google
                Play headlines matching your exact UI layout.
              </p>

              <div className="mt-6 w-full rounded-xl border border-border/80 bg-muted/40 p-3.5 text-left text-xs space-y-2.5">
                <div className="flex items-center gap-2.5 text-foreground font-semibold">
                  <div className="size-6 rounded-md bg-muted border border-border/60 flex items-center justify-center shrink-0">
                    <Sparkles className="size-3.5 text-[#FFB21A]" />
                  </div>
                  <span>10 Free AI Copy Generations on Sign Up</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <div className="size-6 rounded-md bg-muted border border-border/60 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-foreground" />
                  </div>
                  <span>Automatic screenshot visual element detection</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <div className="size-6 rounded-md bg-muted border border-border/60 flex items-center justify-center shrink-0">
                    <Check className="size-3.5 text-foreground" />
                  </div>
                  <span>4 conversion-tested tones & character limits</span>
                </div>
              </div>

              <Button
                onClick={openAuthModal}
                size="lg"
                className="mt-6 w-full gap-2 bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white font-semibold shadow-xs cursor-pointer text-sm h-11 rounded-xl transition-colors"
              >
                <Sparkles className="size-4 text-[#FFB21A]" />
                Sign In to Get 10 Free Credits
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Free forever • Instant access • No credit card required
              </p>
            </div>
          ) : (
            <>
              {/* Current Canvas Copy */}
              {(sceneHeadline || sceneSubhead) && (
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-semibold text-foreground/80 uppercase text-[10px] tracking-wider shrink-0">
                      Current Copy:
                    </span>
                    <span className="font-medium text-foreground truncate">
                      {sceneHeadline || "(No headline)"}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="truncate text-muted-foreground">
                      {sceneSubhead || "(No subhead)"}
                    </span>
                  </div>
                </div>
              )}

              {/* Screen Analysis Callout */}
              {screenAnalysis && (
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs animate-in fade-in duration-200">
                  <div className="rounded-md bg-primary/20 p-1 text-primary shrink-0 mt-0.5">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-primary text-[11px] uppercase tracking-wider">
                      Vision Analysis
                    </span>
                    <p className="text-foreground/90 leading-relaxed">{screenAnalysis}</p>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center animate-in fade-in">
                  <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="size-7 animate-pulse text-primary" />
                    <Loader2 className="absolute size-10 animate-spin text-primary/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Analyzing screen with Gemini Vision…
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Examining visual layout, cards, charts, and text to craft high-converting App
                    Store marketing copy.
                  </p>
                </div>
              )}

              {/* Error Message with Cooldown card */}
              {error && !loading && (
                <div
                  className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                    cooldownSeconds
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {cooldownSeconds ? (
                    <Clock className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-semibold">
                      {cooldownSeconds ? "Generation Limit Reached" : "Generation Failed"}
                    </span>
                    <p className="opacity-90">{error}</p>
                    {cooldownSeconds ? (
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-[11px] font-medium flex items-center gap-1.5">
                          Cooldown remaining:{" "}
                          <span className="font-bold underline">
                            {Math.floor(cooldownSeconds / 60)}:
                            {String(cooldownSeconds % 60).padStart(2, "0")}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchAiSuggestions()}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer text-xs"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Suggestions Grid */}
              {!loading && suggestions.length > 0 && (
                <div className="grid grid-cols-1 gap-3.5 animate-in fade-in">
                  {suggestions.map((suggestion, index) => {
                    const isApplied = appliedIndex === index;
                    const headlineChars = suggestion.headline.length;
                    const subheadChars = suggestion.subhead.length;

                    return (
                      <div
                        key={`${suggestion.tone}-${suggestion.headline}`}
                        className={`group relative flex flex-col justify-between gap-3 rounded-xl border p-4.5 transition-all ${
                          isApplied
                            ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                            : "border-border bg-card/80 hover:border-primary/40 hover:shadow-md"
                        }`}
                      >
                        {/* Top Row: Tone Tag & Character Counters */}
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                            {suggestion.tone}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>
                              Headline:{" "}
                              <span
                                className={
                                  headlineChars > 35
                                    ? "text-amber-500 font-semibold"
                                    : "font-medium"
                                }
                              >
                                {headlineChars}
                              </span>
                              /35
                            </span>
                            <span>•</span>
                            <span>
                              Subhead:{" "}
                              <span
                                className={
                                  subheadChars > 85 ? "text-amber-500 font-semibold" : "font-medium"
                                }
                              >
                                {subheadChars}
                              </span>
                              /85
                            </span>
                          </div>
                        </div>

                        {/* Headline & Subhead Preview */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-base font-bold text-foreground leading-snug">
                              {suggestion.headline}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleApplyHeadlineOnly(suggestion.headline)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:underline shrink-0 cursor-pointer transition-opacity"
                              title="Apply only headline"
                            >
                              Use headline only
                            </button>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {suggestion.subhead}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleApplySubheadOnly(suggestion.subhead)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:underline shrink-0 cursor-pointer transition-opacity"
                              title="Apply only subhead"
                            >
                              Use subhead only
                            </button>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-end border-t border-border/50 pt-3 mt-1">
                          <Button
                            size="sm"
                            onClick={() => handleApplyBoth(suggestion, index)}
                            className={`gap-1.5 cursor-pointer text-xs transition-all ${
                              isApplied
                                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="size-3.5" />
                                <span>Applied to Scene!</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3.5" />
                                <span>Apply to Scene</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Zero credits empty state */}
              {!loading && !isPro && aiCreditsRemaining <= 0 && suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center my-auto py-12 px-4 text-center max-w-sm mx-auto animate-in fade-in">
                  <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Sparkles className="size-6 fill-amber-500" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">Free AI Limit Reached</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    You have used all 10 free AI generations. Upgrade to Pro for unlimited
                    screenshot copywriting and an ad-free experience.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
