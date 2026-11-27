import { ArrowRight, Check, Mic, Pause, Play, Radio, ShieldCheck, Volume2 } from "lucide-react";
import { useState } from "react";
import {
  getShowcaseCategory,
  SHOWCASE_CATEGORIES,
  type ShowcaseCategory,
  type ShowcaseCategoryId,
  type ShowcaseSlide,
} from "@/lib/showcaseCategories";
import { Button } from "./ui/button";

interface CategoryShowcaseProps {
  onDesignStyle: (category: ShowcaseCategory) => void;
}

/**
 * Renders domain-authentic miniature mobile app screens inside realistic
 * hardware bezels so the landing showcase mirrors genuine App Store listings.
 */
function MockAppScreen({ screenType }: { screenType: ShowcaseSlide["screenType"] }) {
  switch (screenType) {
    case "fitness-rings":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0F1013] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Today</span>
            <span className="tabular-nums">92% goal</span>
          </div>
          <div className="my-auto flex flex-col items-center gap-3">
            <svg viewBox="0 0 88 88" className="size-20" aria-hidden="true">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,107,0,0.18)" strokeWidth="6.5" />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="#FF6B00"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray="192 226"
                transform="rotate(-90 44 44)"
              />
              <circle cx="44" cy="44" r="26" fill="none" stroke="rgba(251,113,133,0.18)" strokeWidth="6.5" />
              <circle
                cx="44"
                cy="44"
                r="26"
                fill="none"
                stroke="#FB7185"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray="124 163"
                transform="rotate(-90 44 44)"
              />
              <circle cx="44" cy="44" r="16" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="6.5" />
              <circle
                cx="44"
                cy="44"
                r="16"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray="82 100"
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div className="text-center">
              <div className="text-[15px] font-bold tracking-tight tabular-nums leading-none">
                8,420
              </div>
              <div className="mt-1 text-[7px] text-zinc-400">Steps · 640 kcal burned</div>
            </div>
            <div className="w-full rounded-lg bg-white/[0.05] px-2 py-1.5 flex items-center justify-between text-[6.5px]">
              <span className="text-zinc-400">Morning Run</span>
              <span className="font-semibold text-zinc-200 tabular-nums">5.2 km</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 border-t border-white/10 pt-2 text-center">
            <div>
              <div className="text-[8.5px] font-semibold text-[#FF6B00] tabular-nums">640</div>
              <div className="text-[6px] text-zinc-500">Move</div>
            </div>
            <div>
              <div className="text-[8.5px] font-semibold text-rose-400 tabular-nums">42m</div>
              <div className="text-[6px] text-zinc-500">Active</div>
            </div>
            <div>
              <div className="text-[8.5px] font-semibold text-sky-400 tabular-nums">11h</div>
              <div className="text-[6px] text-zinc-500">Stand</div>
            </div>
          </div>
        </div>
      );

    case "fitness-heart":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0F1013] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Heart Rate</span>
            <span className="text-rose-400 font-medium">Zone 2</span>
          </div>
          <div className="my-auto space-y-2.5">
            <div>
              <span className="text-[18px] font-bold tabular-nums leading-none">72</span>
              <span className="ml-1 text-[7.5px] text-zinc-400">BPM avg</span>
            </div>
            <svg viewBox="0 0 120 46" className="w-full h-14" aria-hidden="true">
              <defs>
                <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FB7185" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 32 L18 30 L26 14 L34 36 L44 25 L62 27 L70 8 L78 35 L88 23 L104 26 L120 18 L120 46 L0 46 Z"
                fill="url(#hrFill)"
              />
              <path
                d="M0 32 L18 30 L26 14 L34 36 L44 25 L62 27 L70 8 L78 35 L88 23 L104 26 L120 18"
                fill="none"
                stroke="#FB7185"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-white/[0.05] px-1.5 py-1">
                <div className="text-[6px] text-zinc-400">Peak</div>
                <div className="text-[8px] font-semibold tabular-nums">148 bpm</div>
              </div>
              <div className="rounded-md bg-white/[0.05] px-1.5 py-1">
                <div className="text-[6px] text-zinc-400">HRV</div>
                <div className="text-[8px] font-semibold text-emerald-400 tabular-nums">64 ms</div>
              </div>
            </div>
          </div>
          <div className="space-y-1 border-t border-white/10 pt-1.5">
            <div className="flex justify-between text-[6.5px] text-zinc-400">
              <span>Resting</span>
              <span className="text-zinc-200 tabular-nums">56 bpm</span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#FF6B00] to-rose-400" />
            </div>
          </div>
        </div>
      );

    case "fitness-streak":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0F1013] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Streak</span>
            <span className="text-[#FF8A00] font-semibold tabular-nums">14 days</span>
          </div>
          <div className="my-auto space-y-2.5">
            <div>
              <div className="text-[11px] font-semibold leading-tight">Weekly Output</div>
              <div className="text-[6.5px] text-zinc-400 mt-0.5 tabular-nums">4,480 kcal total</div>
            </div>
            <div className="flex items-end justify-between gap-1 h-20 pt-1">
              {[
                { id: "mon", day: "M", val: 58 },
                { id: "tue", day: "T", val: 82 },
                { id: "wed", day: "W", val: 65 },
                { id: "thu", day: "T", val: 96 },
                { id: "fri", day: "F", val: 74 },
                { id: "sat", day: "S", val: 88 },
                { id: "sun", day: "S", val: 92 },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xs"
                      style={{
                        height: `${item.val}%`,
                        background:
                          item.id === "sun"
                            ? "#FF6B00"
                            : "linear-gradient(180deg, rgba(255,107,0,0.75), rgba(255,107,0,0.25))",
                      }}
                    />
                  </div>
                  <span className="text-[5.5px] text-zinc-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[7px]">
            <span className="text-zinc-400">Readiness</span>
            <span className="font-semibold text-emerald-400 tabular-nums">94 / 100</span>
          </div>
        </div>
      );

    case "fintech-balance":
      return (
        <div className="flex h-full flex-col justify-between bg-[#081214] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Portfolio</span>
            <span className="text-emerald-400 tabular-nums">+18.4%</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-[13px] font-bold tracking-tight tabular-nums leading-none">
                $38,450.20
              </div>
              <div className="mt-0.5 text-[6.5px] text-emerald-400 tabular-nums">
                +$5,980.12 past year
              </div>
            </div>
            <svg viewBox="0 0 120 44" className="w-full h-11" aria-hidden="true">
              <defs>
                <linearGradient id="wealthArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 36 C18 34, 24 27, 40 28 C56 29, 64 16, 82 17 C96 18, 106 8, 120 6 L120 44 L0 44 Z"
                fill="url(#wealthArea)"
              />
              <path
                d="M0 36 C18 34, 24 27, 40 28 C56 29, 64 16, 82 17 C96 18, 106 8, 120 6"
                fill="none"
                stroke="#34D399"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="space-y-1 border-t border-white/10 pt-1.5 text-[6.5px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">Index ETFs</span>
              <span className="font-medium tabular-nums">64.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Treasury Yield</span>
              <span className="font-medium tabular-nums">35.8%</span>
            </div>
          </div>
        </div>
      );

    case "fintech-card":
      return (
        <div className="flex h-full flex-col justify-between bg-[#081214] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Cards</span>
            <span>Active</span>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-emerald-600/90 via-teal-800 to-zinc-900 p-2 border border-white/15 space-y-3">
            <div className="flex justify-between items-center text-[6.5px] text-emerald-100/90">
              <span className="font-semibold tracking-wider">METAL</span>
              <span className="tabular-nums">4.5% APY</span>
            </div>
            <div className="font-mono text-[7.5px] tracking-widest text-white/90 tabular-nums">
              •••• 4829
            </div>
          </div>
          <div className="space-y-1.5 text-[6.5px]">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Apple Store</span>
              <span className="tabular-nums text-zinc-400">-$129.00</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span>Dividend</span>
              <span className="tabular-nums text-emerald-400">+$242.50</span>
            </div>
          </div>
        </div>
      );

    case "fintech-flow":
      return (
        <div className="flex h-full flex-col justify-between bg-[#081214] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-300">Cashflow</span>
            <span className="tabular-nums">Q4</span>
          </div>
          <div className="my-auto flex items-end justify-between gap-1.5 h-16">
            {[
              { id: "m1", inH: 70, outH: 42 },
              { id: "m2", inH: 85, outH: 48 },
              { id: "m3", inH: 78, outH: 38 },
              { id: "m4", inH: 95, outH: 46 },
            ].map((m) => (
              <div key={m.id} className="flex-1 flex items-end gap-0.5 h-full">
                <div
                  className="flex-1 rounded-t-xs bg-emerald-400/90"
                  style={{ height: `${m.inH}%` }}
                />
                <div
                  className="flex-1 rounded-t-xs bg-white/20"
                  style={{ height: `${m.outH}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 text-[6.5px]">
            <span className="text-zinc-400">Net Saved</span>
            <span className="font-semibold text-emerald-400 tabular-nums">+$4,120</span>
          </div>
        </div>
      );

    case "social-thread":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0D101D] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400 border-b border-white/10 pb-1.5">
            <span className="font-semibold text-zinc-200">#product-launch</span>
            <span className="text-sky-400">6 online</span>
          </div>
          <div className="space-y-2 my-auto py-1">
            <div className="rounded-lg rounded-tl-xs bg-white/10 px-2 py-1.5 text-[6.5px] leading-snug text-zinc-200">
              Updated the iOS 6.9&quot; export frames. Ready for review.
            </div>
            <div className="ml-auto w-[84%] rounded-lg rounded-tr-xs bg-indigo-500 px-2 py-1.5 text-[6.5px] leading-snug text-white">
              Looks sharp — shipping build 2.4 now.
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2 py-1.5">
              <Play className="size-2.5 fill-sky-400 text-sky-400 shrink-0" />
              <div className="flex items-center gap-0.5 flex-1">
                {[
                  { id: "w1", h: 35 },
                  { id: "w2", h: 70 },
                  { id: "w3", h: 50 },
                  { id: "w4", h: 95 },
                  { id: "w5", h: 65 },
                  { id: "w6", h: 80 },
                  { id: "w7", h: 45 },
                  { id: "w8", h: 75 },
                  { id: "w9", h: 40 },
                ].map((bar) => (
                  <span
                    key={bar.id}
                    className="flex-1 rounded-full bg-sky-400/80"
                    style={{ height: `${Math.max(4, Math.round(bar.h / 9))}px` }}
                  />
                ))}
              </div>
              <span className="text-[6px] text-zinc-400 tabular-nums">0:24</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[6.5px] text-zinc-400 border-t border-white/10 pt-1.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-2.5 text-indigo-400" />
              E2E Encrypted
            </span>
            <span className="text-zinc-500">Now</span>
          </div>
        </div>
      );

    case "social-channels":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0D101D] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-semibold text-zinc-200">Channels</span>
            <span className="tabular-nums">3 unread</span>
          </div>
          <div className="space-y-1.5 my-auto">
            {[
              { name: "Design Crit", count: "2", active: true },
              { name: "iOS Release", count: "1", active: true },
              { name: "Engineering", count: "", active: false },
              { name: "Customer Ops", count: "", active: false },
            ].map((ch) => (
              <div
                key={ch.name}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-[7px] ${
                  ch.active ? "bg-indigo-500/20 text-white" : "bg-white/5 text-zinc-400"
                }`}
              >
                <span className="truncate font-medium">{ch.name}</span>
                {ch.count ? (
                  <span className="text-[6px] font-bold text-indigo-300 tabular-nums">{ch.count}</span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="text-[6.5px] text-zinc-500 border-t border-white/10 pt-1.5">
            Synced across 4 devices
          </div>
        </div>
      );

    case "social-huddle":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0D101D] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-semibold text-zinc-200">Huddle</span>
            <span className="text-emerald-400 tabular-nums">12:08</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 my-auto">
            {[
              { initials: "AK", ring: true, bg: "bg-indigo-500/30 text-indigo-200" },
              { initials: "MR", ring: false, bg: "bg-sky-500/25 text-sky-200" },
              { initials: "JL", ring: false, bg: "bg-violet-500/25 text-violet-200" },
              { initials: "TS", ring: false, bg: "bg-white/10 text-zinc-300" },
            ].map((p) => (
              <div
                key={p.initials}
                className={`aspect-square rounded-lg flex items-center justify-center text-[8px] font-bold ${p.bg} ${
                  p.ring ? "ring-1 ring-indigo-400" : ""
                }`}
              >
                {p.initials}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-1.5 text-zinc-300">
            <Mic className="size-2.5 text-indigo-400" />
            <Volume2 className="size-2.5 text-zinc-400" />
          </div>
        </div>
      );

    case "music-player":
      return (
        <div className="flex h-full flex-col justify-between bg-[#110B16] p-2.5 text-white">
          <div className="flex items-center justify-between text-[6.5px] text-zinc-400">
            <span>Now Playing</span>
            <span className="text-fuchsia-300 font-mono">24-bit</span>
          </div>
          <div className="my-auto space-y-2">
            <div className="aspect-square w-full max-w-[78px] mx-auto rounded-lg bg-gradient-to-br from-fuchsia-500 via-purple-700 to-indigo-950 p-2 flex items-end justify-between border border-white/15">
              <div className="size-4 rounded-full border border-white/40 bg-black/30" />
              <div className="text-[6px] font-mono text-white/80">Hi-Res</div>
            </div>
            <div className="text-center">
              <div className="text-[8.5px] font-bold truncate">Midnight Geometry</div>
              <div className="text-[6.5px] text-zinc-400">Klara Nordin</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
              <div className="h-full w-3/5 rounded-full bg-fuchsia-400" />
            </div>
            <div className="flex items-center justify-between text-[6px] font-mono text-zinc-400 tabular-nums">
              <span>2:14</span>
              <Pause className="size-2.5 text-white" />
              <span>3:48</span>
            </div>
          </div>
        </div>
      );

    case "music-eq":
      return (
        <div className="flex h-full flex-col justify-between bg-[#110B16] p-2.5 text-white">
          <div className="flex items-center justify-between text-[7px] text-zinc-400">
            <span className="font-medium text-zinc-200">Spatial EQ</span>
            <Radio className="size-2.5 text-fuchsia-400" />
          </div>
          <div className="my-auto flex items-end justify-between gap-1 h-16">
            {[
              { id: "b1", v: 42 },
              { id: "b2", v: 68 },
              { id: "b3", v: 86 },
              { id: "b4", v: 55 },
              { id: "b5", v: 94 },
              { id: "b6", v: 72 },
              { id: "b7", v: 60 },
              { id: "b8", v: 82 },
              { id: "b9", v: 48 },
            ].map((band) => (
              <div
                key={band.id}
                className="flex-1 rounded-full bg-gradient-to-t from-purple-600 via-fuchsia-400 to-pink-300"
                style={{ height: `${band.v}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 text-[6.5px] text-zinc-400">
            <span>Studio Reference</span>
            <span className="text-fuchsia-300 tabular-nums">192 kHz</span>
          </div>
        </div>
      );

    case "music-mixes":
      return (
        <div className="flex h-full flex-col justify-between bg-[#110B16] p-2.5 text-white">
          <div className="text-[7px] font-medium text-zinc-300">Daily Mixes</div>
          <div className="grid grid-cols-2 gap-1.5 my-auto">
            {[
              { label: "Focus", grad: "from-fuchsia-600 to-purple-900" },
              { label: "Ambient", grad: "from-violet-600 to-indigo-950" },
              { label: "Vinyl", grad: "from-rose-500 to-purple-900" },
              { label: "Acoustic", grad: "from-amber-500 to-rose-900" },
            ].map((mix) => (
              <div
                key={mix.label}
                className={`aspect-square rounded-md bg-gradient-to-br ${mix.grad} p-1.5 flex items-end border border-white/10`}
              >
                <span className="text-[6.5px] font-semibold text-white">{mix.label}</span>
              </div>
            ))}
          </div>
          <div className="text-[6.5px] text-zinc-500 border-t border-white/10 pt-1.5">
            Updated 06:00 AM
          </div>
        </div>
      );

    case "prod-focus":
      return (
        <div className="flex h-full flex-col justify-between bg-white p-2.5 text-zinc-900">
          <div className="flex items-center justify-between text-[7px] text-zinc-500">
            <span className="font-semibold text-zinc-800">Deep Work</span>
            <span className="tabular-nums">Block 2/4</span>
          </div>
          <div className="my-auto flex flex-col items-center gap-1.5">
            <div className="relative size-16 flex items-center justify-center">
              <svg viewBox="0 0 72 72" className="size-16" aria-hidden="true">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#E4E4E7" strokeWidth="4.5" />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="#18181B"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray="138 188"
                  transform="rotate(-90 36 36)"
                />
              </svg>
              <span className="absolute text-[10px] font-bold font-mono tabular-nums text-zinc-900">
                25:00
              </span>
            </div>
            <div className="text-[7px] font-medium text-zinc-600">Design System Audit</div>
          </div>
          <div className="rounded-md bg-zinc-900 py-1 text-center text-[6.5px] font-semibold text-white">
            Pause Session
          </div>
        </div>
      );

    case "prod-board":
      return (
        <div className="flex h-full flex-col justify-between bg-white p-2.5 text-zinc-900">
          <div className="flex items-center justify-between text-[7px] text-zinc-500">
            <span className="font-semibold text-zinc-800">Today</span>
            <span className="tabular-nums">3 / 4 done</span>
          </div>
          <div className="space-y-1.5 my-auto">
            {[
              { text: "Finalize store copy", done: true },
              { text: "Export 6.9\" PNGs", done: true },
              { text: "Verify contrast", done: true },
              { text: "Submit build 2.4", done: false },
            ].map((task) => (
              <div
                key={task.text}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-1.5 py-1 text-[6.5px]"
              >
                <span
                  className={`size-2.5 rounded-xs flex items-center justify-center shrink-0 ${
                    task.done
                      ? "bg-[#FF6B00] text-white"
                      : "border border-zinc-300 bg-white"
                  }`}
                >
                  {task.done ? <Check className="size-2 stroke-[3]" /> : null}
                </span>
                <span className={task.done ? "line-through text-zinc-400 truncate" : "font-medium text-zinc-800 truncate"}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[6.5px] text-zinc-400 border-t border-zinc-100 pt-1.5">
            Zero overdue tasks
          </div>
        </div>
      );

    case "prod-velocity":
      return (
        <div className="flex h-full flex-col justify-between bg-white p-2.5 text-zinc-900">
          <div className="flex items-center justify-between text-[7px] text-zinc-500">
            <span className="font-semibold text-zinc-800">Velocity</span>
            <span className="text-[#FF6B00] font-semibold tabular-nums">+24%</span>
          </div>
          <div className="my-auto flex items-end justify-between gap-1 h-16 pt-2">
            {[
              { id: "d1", h: 40 },
              { id: "d2", h: 55 },
              { id: "d3", h: 48 },
              { id: "d4", h: 72 },
              { id: "d5", h: 85 },
              { id: "d6", h: 78 },
              { id: "d7", h: 96 },
            ].map((day) => (
              <div
                key={day.id}
                className={`flex-1 rounded-t-xs ${day.id === "d7" ? "bg-[#FF6B00]" : "bg-zinc-900/80"}`}
                style={{ height: `${day.h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-[6.5px]">
            <span className="text-zinc-500">Shipped</span>
            <span className="font-semibold text-zinc-900 tabular-nums">28 tasks</span>
          </div>
        </div>
      );
  }
}

export function CategoryShowcase({ onDesignStyle }: CategoryShowcaseProps) {
  const [activeId, setActiveId] = useState<ShowcaseCategoryId>("fitness");
  const activeCategory = getShowcaseCategory(activeId);

  return (
    <section
      id="showcase"
      className="py-14 sm:py-18 lg:py-20 scroll-mt-14 bg-white dark:bg-black px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
              Category Showcase
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[2.5rem] font-extrabold tracking-tight leading-[1.12] text-zinc-900 dark:text-white text-balance">
              Production Screenshot Systems for Every App Category
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
              Inspect complete 3-slide App Store sequences tuned for legibility, contrast, and
              hardware framing. Open any style directly in Studio.
            </p>
          </div>

          {/* Interactive Segmented Category Selector */}
          <div
            role="tablist"
            aria-label="App store showcase categories"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 self-start lg:self-end"
          >
            {SHOWCASE_CATEGORIES.map((cat) => {
              const selected = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                    selected
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {cat.categoryLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Interactive Spotlight Stage (Single-Elevation Editorial Container) */}
        <div
          role="tabpanel"
          aria-label={`${activeCategory.categoryLabel} screenshot preview`}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-zinc-800/80">
            {/* Left Spec Column (5 cols) */}
            <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-8">
              <div>
                {/* Clean Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                    {activeCategory.categoryLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>iOS &amp; Android</span>
                  <span aria-hidden="true">·</span>
                  <span>3-Slide Sequence</span>
                </div>

                <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white text-balance">
                  {activeCategory.title}
                </h3>

                <p className="mt-3 text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {activeCategory.description}
                </p>

                {/* Architectural Key-Value Spec Table */}
                <dl className="mt-7 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3.5 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">Sequence</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100 text-right">
                      {activeCategory.layoutSequence}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">Typography</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100 text-right">
                      {activeCategory.typography}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">Export Sizes</dt>
                    <dd className="font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums text-right">
                      {activeCategory.exportTargets}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">Color System</dt>
                    <dd className="flex items-center gap-2">
                      {activeCategory.palette.map((hex) => (
                        <span
                          key={hex}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-300"
                        >
                          <span
                            className="size-3 rounded-full border border-black/15 dark:border-white/20 shrink-0"
                            style={{ backgroundColor: hex }}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline">{hex}</span>
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Single Clear Primary CTA */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  onClick={() => onDesignStyle(activeCategory)}
                  className="h-11 px-6 rounded-xl font-semibold text-sm bg-[#FF6B00] hover:bg-[#e86100] text-white shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Design This Style</span>
                  <ArrowRight className="size-4" />
                </Button>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {activeCategory.summaryStat}
                </span>
              </div>
            </div>

            {/* Right Preview Canvas (7 cols): Authentic 3-Slide App Store Strip */}
            <div className="lg:col-span-7 bg-zinc-50/90 dark:bg-zinc-900/50 p-5 sm:p-8 lg:p-10 flex flex-col justify-center relative overflow-hidden">
              {/* Subtle architectural dot backdrop */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(113,113,122,0.35) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4 lg:gap-5 items-end">
                {activeCategory.slides.map((slide, idx) => {
                  const isLightTile = activeCategory.tileTone === "light";
                  const isCenter = idx === 1;
                  return (
                    <div
                      key={`${activeCategory.id}-${slide.id}`}
                      className={`group rounded-2xl overflow-hidden border transition-transform duration-200 ease-out flex flex-col justify-between pt-3.5 sm:pt-4 px-2.5 sm:px-3.5 pb-0 shadow-md ${
                        isLightTile
                          ? "border-zinc-300/80 text-zinc-900"
                          : "border-white/12 text-white"
                      } ${isCenter ? "lg:-translate-y-2 shadow-lg" : ""}`}
                      style={{
                        background: activeCategory.tileBackground,
                        aspectRatio: "9 / 17.6",
                      }}
                    >
                      {/* Authentic Store Marketing Caption */}
                      <div className="text-center px-0.5 mb-2.5 sm:mb-3 shrink-0">
                        <div className="text-[10px] sm:text-xs font-extrabold tracking-tight leading-tight">
                          {slide.caption}
                        </div>
                        <div
                          className={`mt-0.5 text-[7.5px] sm:text-[9px] leading-snug line-clamp-1 ${
                            isLightTile ? "text-zinc-600" : "text-white/70"
                          }`}
                        >
                          {slide.subcaption}
                        </div>
                      </div>

                      {/* Sleek Hardware iPhone Bezel Cropped Cleanly at Bottom */}
                      <div className="flex-1 min-h-0 flex items-end justify-center">
                        <div className="w-full h-full rounded-t-[18px] sm:rounded-t-[22px] bg-zinc-950 p-[4px] sm:p-[5px] pb-0 border-x border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.35)] flex flex-col">
                          {/* Dynamic Island */}
                          <div className="relative w-full flex-1 rounded-t-[14px] sm:rounded-t-[17px] overflow-hidden bg-zinc-950 flex flex-col">
                            <div
                              aria-hidden="true"
                              className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 w-8 sm:w-10 h-2 sm:h-2.5 rounded-full bg-black border border-white/10"
                            />
                            <div className="pt-4 sm:pt-4.5 flex-1 min-h-0 flex flex-col">
                              <MockAppScreen screenType={slide.screenType} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clean Caption Rail below the 3-Slide Strip */}
              <div className="relative z-10 mt-5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Live 3-slide App Store preview · 6.9&quot; iPhone 16 Pro</span>
                <span className="font-mono tabular-nums hidden sm:inline">sRGB · 72 DPI PNG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Symmetrical 5-Across Category Selector Grid (Zero Orphan Gaps) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SHOWCASE_CATEGORIES.map((cat) => {
            const isSelected = cat.id === activeId;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveId(cat.id)}
                className={`group text-left rounded-xl p-4 border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                  isSelected
                    ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900"
                    : "border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    {cat.categoryLabel}
                  </span>
                  <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                    {cat.palette.slice(1).map((swatch) => (
                      <span
                        key={swatch}
                        className="size-2 rounded-full border border-black/10 dark:border-white/15"
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white leading-snug">
                    {cat.title}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                    {cat.summaryStat}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
