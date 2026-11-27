import { Eye, EyeOff, Image as ImageIcon, Move, Smartphone, Sparkles } from "lucide-react";
import { memo, type RefObject } from "react";
import type { IconPreviewMode } from "./presets";

interface IconPreviewPaneProps {
  appName: string;
  iconSrc: string | null;
  bgType: "preset" | "custom" | "transparent";
  activeBackground: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  cornerRadius: number;
  imgAspect: number;
  isDragging: boolean;
  previewMode: IconPreviewMode;
  showSafeArea: boolean;
  previewStageRef: RefObject<HTMLDivElement | null>;
  onSelectPreviewMode: (mode: IconPreviewMode) => void;
  onToggleSafeArea: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const IconPreviewPane = memo(function IconPreviewPane({
  appName,
  iconSrc,
  bgType,
  activeBackground,
  scale,
  offsetX,
  offsetY,
  cornerRadius,
  imgAspect,
  isDragging,
  previewMode,
  showSafeArea,
  previewStageRef,
  onSelectPreviewMode,
  onToggleSafeArea,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: IconPreviewPaneProps) {
  return (
    <div className="lg:col-span-7 p-6 flex flex-col items-center justify-between bg-muted/20 gap-6">
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shadow-2xs">
        <button
          type="button"
          onClick={() => onSelectPreviewMode("google-play")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            previewMode === "google-play"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Google Play (512px)</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectPreviewMode("apple-ios")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            previewMode === "apple-ios"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>App Store (1024px)</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectPreviewMode("master-square")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            previewMode === "master-square"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Flat Master (1:1)</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectPreviewMode("home-screen")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            previewMode === "home-screen"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="size-3.5 text-[#FF6B00]" />
          <span>Home Screen</span>
        </button>
      </div>

      {previewMode === "home-screen" ? (
        <HomeScreenMockup
          appName={appName}
          iconSrc={iconSrc}
          activeBackground={activeBackground}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          cornerRadius={cornerRadius}
          imgAspect={imgAspect}
        />
      ) : (
        <div className="relative flex items-center justify-center p-8 my-auto select-none">
          <div
            ref={previewStageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative size-56 sm:size-64 flex items-center justify-center transition-all duration-300 overflow-hidden touch-none select-none ${
              cornerRadius > 0
                ? "shadow-2xl shadow-black/35 ring-1 ring-black/10"
                : "shadow-xl shadow-black/20 border border-border"
            } ${iconSrc ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""} ${
              bgType === "transparent"
                ? "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:12px_12px]"
                : ""
            }`}
            style={{
              borderRadius: `${cornerRadius}%`,
              background: activeBackground,
            }}
          >
            {iconSrc ? (
              <img
                src={iconSrc}
                alt="Logo"
                className={`max-w-none select-none object-contain pointer-events-none ${
                  isDragging ? "transition-none" : "transition-transform duration-100"
                }`}
                style={{
                  width: imgAspect >= 1 ? `${scale}%` : `${scale * imgAspect}%`,
                  height: imgAspect >= 1 ? `${scale / imgAspect}%` : `${scale}%`,
                  transform: `translate(${offsetX}%, ${offsetY}%)`,
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 text-white/90 pointer-events-none">
                <ImageIcon className="size-12 stroke-1 mb-2 opacity-80" />
                <span className="text-xs font-bold">No Logo Uploaded</span>
                <span className="text-[10px] opacity-75 mt-0.5">Upload a PNG or SVG logo</span>
              </div>
            )}

            {showSafeArea && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-full border-2 border-dashed border-white/40 dark:border-black/40 shadow-2xs"
                  style={{ width: "72%", height: "72%" }}
                />
              </div>
            )}

            {iconSrc && (
              <div className="pointer-events-none absolute bottom-2.5 inset-x-0 flex justify-center">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-background/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-border/70 shadow-xs">
                  <Move className="size-3 text-primary shrink-0" />
                  <span>Drag to reposition</span>
                  {(offsetX !== 0 || offsetY !== 0) && (
                    <span className="font-mono text-primary font-bold">
                      ({offsetX > 0 ? `+${offsetX}` : offsetX}%,{" "}
                      {offsetY > 0 ? `+${offsetY}` : offsetY}%)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5 font-medium">
          {previewMode === "home-screen" ? (
            <span>Simulated Mobile Home Screen Mockup • Live preview alongside native apps</span>
          ) : cornerRadius === 0 ? (
            <span>Master Square (Raw 1:1 format required by console validators)</span>
          ) : cornerRadius === 20 ? (
            <span>Google Play Squircle (20% Corner Radius)</span>
          ) : cornerRadius === 22.5 ? (
            <span>Apple App Store Squircle (22.5% Corner Radius)</span>
          ) : cornerRadius === 50 ? (
            <span>Circular App Icon / Avatar (50% Radius)</span>
          ) : (
            <span>Custom Corner Radius ({cornerRadius}%)</span>
          )}
        </span>

        {previewMode !== "home-screen" && (
          <button
            type="button"
            onClick={onToggleSafeArea}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
              showSafeArea
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle safe area margin guide"
          >
            {showSafeArea ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            <span>Safe Area Guide</span>
          </button>
        )}
      </div>
    </div>
  );
});

const HomeScreenMockup = memo(function HomeScreenMockup({
  appName,
  iconSrc,
  activeBackground,
  scale,
  offsetX,
  offsetY,
  cornerRadius,
  imgAspect,
}: {
  appName: string;
  iconSrc: string | null;
  activeBackground: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  cornerRadius: number;
  imgAspect: number;
}) {
  return (
    <div className="relative flex items-center justify-center py-2 my-auto select-none">
      <div className="w-[240px] h-[460px] rounded-[38px] border-[5px] border-neutral-800/90 bg-neutral-950 shadow-2xl relative overflow-hidden flex flex-col justify-between p-3 select-none ring-1 ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-black opacity-95" />
        <div className="absolute -top-10 -right-10 size-44 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />
        <div className="absolute top-40 -left-10 size-44 rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 w-full flex items-center justify-between text-[9px] font-semibold text-white/90 px-2 pt-0.5">
          <span>9:41</span>
          <div className="w-16 h-3.5 bg-black rounded-full border border-neutral-800/50 flex items-center justify-end px-1.5">
            <div className="size-1.5 rounded-full bg-neutral-900 border border-neutral-700" />
          </div>
          <div className="flex items-center gap-1 text-[8px]">
            <span>5G</span>
            <div className="w-3.5 h-2 border border-white/70 rounded-xs p-0.2 flex items-center">
              <div className="w-2 h-full bg-white rounded-2xs" />
            </div>
          </div>
        </div>

        <div className="relative z-10 px-2 pt-1 text-center">
          <div className="text-[10px] font-medium text-white/70">Tuesday, September 15</div>
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-y-3 gap-x-2 px-1 pt-2 my-auto">
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-white flex items-center justify-center shadow-xs">
              <div className="size-6 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-400 opacity-90" />
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Photos
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-neutral-800 flex items-center justify-center shadow-xs border border-neutral-700">
              <div className="size-5 rounded-full border-2 border-neutral-400 bg-neutral-900" />
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Camera
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-xs">
              <div className="size-4 rotate-45 border-2 border-white rounded-xs" />
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Maps
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-black flex items-center justify-center shadow-xs border border-neutral-800 text-white text-[9px] font-mono font-bold">
              9:41
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Clock
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-blue-500 flex items-center justify-center shadow-xs">
              <div className="w-5 h-3.5 border border-white rounded-2xs flex items-center justify-center text-white text-[8px]">
                ✉
              </div>
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Mail
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xs text-white text-xs">
              ☀️
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Weather
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-amber-100 flex flex-col justify-between p-1.5 shadow-xs border border-amber-300">
              <div className="w-full h-1 bg-amber-400 rounded-full" />
              <div className="w-3/4 h-0.5 bg-neutral-400 rounded-full" />
              <div className="w-1/2 h-0.5 bg-neutral-400 rounded-full" />
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Notes
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-white flex flex-col items-center justify-center shadow-xs border border-neutral-200">
              <span className="text-[6px] font-bold text-red-500 uppercase leading-none">TUE</span>
              <span className="text-[11px] font-bold text-neutral-900 leading-none">15</span>
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Calendar
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-neutral-600 flex items-center justify-center shadow-xs border border-neutral-500 text-white text-[11px]">
              ⚙️
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Settings
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-xs text-white text-[10px] font-bold">
              A
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              App Store
            </span>
          </div>

          <div
            className="flex flex-col items-center gap-1 relative group cursor-pointer"
            title="Your App Icon"
          >
            <div
              className="size-10 flex items-center justify-center shadow-md relative overflow-hidden ring-2 ring-[#FF6B00] ring-offset-1 ring-offset-black/60 transition-transform group-hover:scale-105"
              style={{
                borderRadius: `${Math.max(18, cornerRadius)}%`,
                background: activeBackground,
              }}
            >
              {iconSrc ? (
                <img
                  src={iconSrc}
                  alt={appName}
                  className="max-w-none select-none object-contain pointer-events-none"
                  style={{
                    width: imgAspect >= 1 ? `${scale}%` : `${scale * imgAspect}%`,
                    height: imgAspect >= 1 ? `${scale / imgAspect}%` : `${scale}%`,
                    transform: `translate(${offsetX}%, ${offsetY}%)`,
                  }}
                />
              ) : (
                <Sparkles className="size-4 text-white" />
              )}
            </div>
            <span className="text-[8px] text-white font-bold truncate max-w-[44px] text-center drop-shadow-xs">
              {appName}
            </span>
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#FF6B00] border border-white animate-pulse" />
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="size-10 rounded-[10px] bg-white flex items-center justify-center shadow-xs text-rose-500 text-[10px]">
              ❤️
            </div>
            <span className="text-[8px] text-white/80 font-medium truncate max-w-[42px]">
              Health
            </span>
          </div>
        </div>

        <div className="relative z-10 w-full rounded-2xl bg-white/20 backdrop-blur-md p-1.5 flex items-center justify-around border border-white/20 shadow-lg">
          <div className="size-9 rounded-[9px] bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-xs">
            📞
          </div>
          <div className="size-9 rounded-[9px] bg-white flex items-center justify-center shadow-xs border border-neutral-300 text-[10px]">
            🧭
          </div>
          <div className="size-9 rounded-[9px] bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-xs">
            💬
          </div>
          <div className="size-9 rounded-[9px] bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center text-white text-[10px] shadow-xs">
            🎵
          </div>
        </div>

        <div className="relative z-10 w-24 h-1 bg-white/70 rounded-full mx-auto mt-1" />
      </div>
    </div>
  );
});
