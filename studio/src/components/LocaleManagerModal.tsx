import {
  AlertCircle,
  Check,
  Copy,
  Globe,
  Languages,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Design, isRtlLocale, type SceneCopy, type StoreManifest } from "../manifest";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export type PresetLocale = {
  code: string;
  label: string;
  rtl: boolean;
};

export const PRESET_LOCALES: PresetLocale[] = [
  { code: "en-US", label: "English (US)", rtl: false },
  { code: "es-ES", label: "Spanish (Spain)", rtl: false },
  { code: "es-MX", label: "Spanish (Mexico)", rtl: false },
  { code: "fr-FR", label: "French (France)", rtl: false },
  { code: "de-DE", label: "German (Germany)", rtl: false },
  { code: "it-IT", label: "Italian (Italy)", rtl: false },
  { code: "pt-BR", label: "Portuguese (Brazil)", rtl: false },
  { code: "ja-JP", label: "Japanese", rtl: false },
  { code: "ko-KR", label: "Korean", rtl: false },
  { code: "zh-Hans", label: "Chinese (Simplified)", rtl: false },
  { code: "zh-Hant", label: "Chinese (Traditional)", rtl: false },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)", rtl: true },
  { code: "he-IL", label: "Hebrew (Israel)", rtl: true },
  { code: "fa-IR", label: "Persian (Iran)", rtl: true },
  { code: "ur-PK", label: "Urdu (Pakistan)", rtl: true },
  { code: "ru-RU", label: "Russian", rtl: false },
  { code: "hi-IN", label: "Hindi (India)", rtl: false },
  { code: "tr-TR", label: "Turkish", rtl: false },
  { code: "nl-NL", label: "Dutch (Netherlands)", rtl: false },
  { code: "vi-VN", label: "Vietnamese", rtl: false },
  { code: "th-TH", label: "Thai", rtl: false },
  { code: "id-ID", label: "Indonesian", rtl: false },
  { code: "sv-SE", label: "Swedish", rtl: false },
];

export type LocaleManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  manifest: StoreManifest;
  design: Design;
  copy: Record<string, SceneCopy>;
  onUpdateLocaleCopy: (
    sceneId: string,
    field: "headline" | "subhead",
    locale: string,
    text: string,
  ) => void;
  onRefreshManifest: () => void;
  activeLocale: string;
  onSelectLocale: (locale: string) => void;
};

export function LocaleManagerModal({
  isOpen,
  onClose,
  manifest,
  design,
  copy,
  onUpdateLocaleCopy,
  onRefreshManifest,
  activeLocale,
  onSelectLocale,
}: LocaleManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "locales">("matrix");
  const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>("all");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customLocale, setCustomLocale] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const locales = manifest.locales.length > 0 ? manifest.locales : ["en-US"];
  const baseLocale = locales[0] || "en-US";

  // Filter available presets that are not already added
  const availablePresets = useMemo(() => {
    return PRESET_LOCALES.filter((p) => !locales.includes(p.code));
  }, [locales]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddLocale = async (localeToAdd: string) => {
    const l = localeToAdd.trim();
    if (!l) return;
    if (locales.includes(l)) {
      setErrorMessage(`Locale "${l}" is already in the project.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", locale: l }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to add locale (${res.status})`);
      }

      onRefreshManifest();
      onSelectLocale(l);
      setSelectedPreset("");
      setCustomLocale("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLocale = async (localeToRemove: string) => {
    if (locales.length <= 1) {
      setErrorMessage("At least one locale is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", locale: localeToRemove }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to remove locale (${res.status})`);
      }

      onRefreshManifest();
      if (activeLocale === localeToRemove) {
        const remaining = locales.filter((l) => l !== localeToRemove);
        onSelectLocale(remaining[0] || "en-US");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocaleName = (code: string) => {
    const preset = PRESET_LOCALES.find((p) => p.code.toLowerCase() === code.toLowerCase());
    return preset ? preset.label : code;
  };

  const copyFromBase = (sceneId: string, field: "headline" | "subhead", targetLocale: string) => {
    const scene = design.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const baseText =
      field === "headline"
        ? (copy[sceneId]?.headline?.[baseLocale] ?? scene.headline[baseLocale] ?? "")
        : (copy[sceneId]?.subhead?.[baseLocale] ?? scene.subhead?.[baseLocale] ?? "");

    onUpdateLocaleCopy(sceneId, field, targetLocale, baseText);

    const key = `${sceneId}:${field}:${targetLocale}`;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const filteredScenes =
    selectedSceneFilter === "all"
      ? design.scenes
      : design.scenes.filter((s) => s.id === selectedSceneFilter);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Translation Matrix & Locales"
      className="animate-in fade-in fixed inset-0 z-50 flex duration-150 items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[88vh] max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-foreground">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Languages className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Translation Matrix & Locales</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage App Store and Google Play release copy across all scenes and configure
                languages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Content / Tabs */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "matrix" | "locales")}
            className="flex flex-1 min-h-0 flex-col h-full gap-0"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-2.5 bg-background/50">
              <TabsList className="bg-muted/70">
                <TabsTrigger value="matrix" className="gap-2 text-xs">
                  <Languages className="size-3.5" />
                  <span>Translation Matrix</span>
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                    {locales.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="locales" className="gap-2 text-xs">
                  <Globe className="size-3.5" />
                  <span>Manage Locales</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "matrix" && design.scenes.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Filter Scene:</span>
                  <select
                    value={selectedSceneFilter}
                    onChange={(e) => setSelectedSceneFilter(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
                  >
                    <option value="all">All Scenes ({design.scenes.length})</option>
                    {design.scenes.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {idx + 1}. {s.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Tab 1: Translation Matrix */}
            <TabsContent
              value="matrix"
              className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 overscroll-contain focus-visible:outline-none"
            >
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {filteredScenes.map((scene, sceneIndex) => (
                <div
                  key={scene.id}
                  className="rounded-xl border border-border bg-background shadow-xs overflow-hidden"
                >
                  {/* Scene Title Bar */}
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground/80">
                        {sceneIndex + 1}
                      </span>
                      <span className="font-semibold text-sm">{scene.id}</span>
                      <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded">
                        layout: {scene.layout || "theme"}
                      </span>
                    </div>
                  </div>

                  {/* Matrix Table */}
                  <div className="divide-y divide-border overflow-x-auto">
                    {locales.map((loc) => {
                      const rtl = isRtlLocale(loc);
                      const isBase = loc === baseLocale;
                      const headlineVal =
                        copy[scene.id]?.headline?.[loc] ?? scene.headline[loc] ?? "";
                      const subheadVal =
                        copy[scene.id]?.subhead?.[loc] ?? scene.subhead?.[loc] ?? "";

                      return (
                        <div
                          key={loc}
                          className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-start hover:bg-muted/10 transition-colors min-w-[650px] lg:min-w-0"
                        >
                          {/* Locale Label */}
                          <div className="md:col-span-3 flex flex-col gap-1.5 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground">
                                {getLocaleName(loc)}
                              </span>
                              {isBase && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Base
                                </span>
                              )}
                              {rtl && (
                                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                                  RTL
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {loc}
                            </span>
                            {!isBase && (
                              <button
                                type="button"
                                onClick={() => {
                                  copyFromBase(scene.id, "headline", loc);
                                  copyFromBase(scene.id, "subhead", loc);
                                }}
                                className="mt-1 flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors w-fit"
                              >
                                <Copy className="size-3" />
                                <span>Copy from Base</span>
                              </button>
                            )}
                          </div>

                          {/* Headline Input */}
                          <div className="md:col-span-5 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-medium text-muted-foreground">
                                Headline
                              </Label>
                              <span
                                className={`text-[10px] font-mono ${
                                  headlineVal.length > 40
                                    ? "text-destructive"
                                    : headlineVal.length > 30
                                      ? "text-amber-500"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {headlineVal.length}/35 chars
                              </span>
                            </div>
                            <div className="relative">
                              <textarea
                                rows={2}
                                dir={rtl ? "rtl" : "ltr"}
                                value={headlineVal}
                                onChange={(e) =>
                                  onUpdateLocaleCopy(scene.id, "headline", loc, e.target.value)
                                }
                                placeholder={`Headline in ${loc}...`}
                                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-y ${
                                  rtl ? "text-right font-arabic" : "text-left"
                                }`}
                              />
                              {!isBase && !headlineVal && (
                                <button
                                  type="button"
                                  onClick={() => copyFromBase(scene.id, "headline", loc)}
                                  title="Copy base headline"
                                  className="absolute right-2 top-2 text-muted-foreground/50 hover:text-primary transition-colors"
                                >
                                  {copiedKey === `${scene.id}:headline:${loc}` ? (
                                    <Check className="size-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subhead Input */}
                          <div className="md:col-span-4 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-medium text-muted-foreground">
                                Subhead (Optional)
                              </Label>
                              <span
                                className={`text-[10px] font-mono ${
                                  subheadVal.length > 80
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {subheadVal.length}/70 chars
                              </span>
                            </div>
                            <div className="relative">
                              <textarea
                                rows={2}
                                dir={rtl ? "rtl" : "ltr"}
                                value={subheadVal}
                                onChange={(e) =>
                                  onUpdateLocaleCopy(scene.id, "subhead", loc, e.target.value)
                                }
                                placeholder={`Subhead in ${loc}...`}
                                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-y ${
                                  rtl ? "text-right font-arabic" : "text-left"
                                }`}
                              />
                              {!isBase && !subheadVal && (
                                <button
                                  type="button"
                                  onClick={() => copyFromBase(scene.id, "subhead", loc)}
                                  title="Copy base subhead"
                                  className="absolute right-2 top-2 text-muted-foreground/50 hover:text-primary transition-colors"
                                >
                                  {copiedKey === `${scene.id}:subhead:${loc}` ? (
                                    <Check className="size-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Tab 2: Manage Locales */}
            <TabsContent
              value="locales"
              className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 overscroll-contain focus-visible:outline-none"
            >
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Add New Locale */}
              <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  <span>Add New Release Locale</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Add target languages for your App Store Connect & Google Play Console submissions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preset Dropdown */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Popular Language Preset</Label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPreset}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
                      >
                        <option value="">-- Choose a standard preset --</option>
                        {availablePresets.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label} ({p.code}){p.rtl ? " - RTL" : ""}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={() => selectedPreset && handleAddLocale(selectedPreset)}
                        disabled={!selectedPreset || isSubmitting}
                        className="h-9 gap-1.5 px-3 text-xs shrink-0"
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Plus className="size-3.5" />
                        )}
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>

                  {/* Custom Locale Code */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Or Enter Custom Locale Code</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. nl-BE, pt-PT"
                        value={customLocale}
                        onChange={(e) => setCustomLocale(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 text-xs"
                      />
                      <Button
                        type="button"
                        onClick={() => customLocale && handleAddLocale(customLocale)}
                        disabled={!customLocale.trim() || isSubmitting}
                        variant="secondary"
                        className="h-9 gap-1.5 px-3 text-xs shrink-0"
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Plus className="size-3.5" />
                        )}
                        <span>Add Custom</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configured Locales List */}
              <div className="rounded-xl border border-border bg-background shadow-xs overflow-hidden">
                <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Configured Locales ({locales.length})</h3>
                  <span className="text-xs text-muted-foreground">
                    Active in goldie.config.ts & manifest
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {locales.map((loc, idx) => {
                    const rtl = isRtlLocale(loc);
                    const isBase = idx === 0;
                    return (
                      <div
                        key={loc}
                        className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-muted font-mono text-xs font-semibold">
                            {loc.split(/[-_]/)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground">
                                {getLocaleName(loc)}
                              </span>
                              {isBase && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Default / Base
                                </span>
                              )}
                              {rtl && (
                                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                                  RTL Layout
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">{loc}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onSelectLocale(loc);
                              setActiveTab("matrix");
                            }}
                            className="h-8 text-xs"
                          >
                            View in Matrix
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLocale(loc)}
                            disabled={locales.length <= 1 || isSubmitting}
                            title={
                              locales.length <= 1
                                ? "At least one locale is required"
                                : `Remove ${loc}`
                            }
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span>Translations auto-save to goldie.design.json and render in live preview.</span>
          </div>
          <Button type="button" onClick={onClose} className="text-xs px-4 h-8">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
