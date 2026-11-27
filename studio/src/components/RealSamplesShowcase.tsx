import { ArrowRight, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSampleAtIndex,
  STUDIO_SAMPLE_SCREENSHOTS,
  type SampleScreenshot,
  stepSampleIndex,
} from "@/lib/sampleGallery";
import { Button } from "./ui/button";

export function RealSamplesShowcase({
  onStartDesigning,
}: {
  onStartDesigning: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeSample: SampleScreenshot | null =
    lightboxIndex !== null ? getSampleAtIndex(lightboxIndex) : null;

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLightboxIndex((prev) =>
          prev === null ? null : stepSampleIndex(prev, 1, STUDIO_SAMPLE_SCREENSHOTS.length),
        );
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLightboxIndex((prev) =>
          prev === null ? null : stepSampleIndex(prev, -1, STUDIO_SAMPLE_SCREENSHOTS.length),
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex]);

  return (
    <section
      id="samples"
      aria-labelledby="real-samples-heading"
      className="py-14 sm:py-18 lg:py-22 bg-white dark:bg-black px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800/80 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-[#FF6B00] dark:text-[#FF8A00]">
              Real Studio Export
            </p>
            <h2
              id="real-samples-heading"
              className="mt-2 text-2xl sm:text-3xl lg:text-[2.5rem] font-extrabold tracking-tight leading-[1.12] text-zinc-900 dark:text-white text-balance"
            >
              Made with AppAssets Studio
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              An actual 5-screen App Store sequence built and exported directly in AppAssets Studio
              — combining centered hero framing, angled perspectives, and duo overlap layouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 shrink-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>5-Screen Sequence</span>
              <span aria-hidden="true">·</span>
              <span>iPhone 6.9&quot; Frame</span>
              <span aria-hidden="true">·</span>
              <span>Arctic Mint</span>
            </div>
            <Button
              type="button"
              onClick={onStartDesigning}
              className="h-9.5 px-5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8A00] active:bg-[#e05f00] text-white text-xs font-semibold shadow-xs cursor-pointer gap-1.5 whitespace-nowrap shrink-0 w-fit"
            >
              <span>Create Yours in Studio</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* 5-Column Full App Store Sequence Strip */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-950/80 p-4 sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {STUDIO_SAMPLE_SCREENSHOTS.map((sample, index) => {
              const hasFailed = Boolean(failedImages[sample.id]);
              return (
                <figure key={sample.id} className="group flex flex-col">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Inspect ${sample.title} full-size screenshot`}
                    className="relative w-full aspect-[9/19.5] overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-[#D7FAFC] dark:bg-zinc-900 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:border-[#FF6B00]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 cursor-pointer text-left"
                  >
                    {hasFailed ? (
                      <div className="flex size-full flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-cyan-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {sample.title}
                        </span>
                        <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {sample.layoutLabel}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={sample.src}
                        alt={sample.alt}
                        referrerPolicy="no-referrer"
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [sample.id]: true }))
                        }
                        className="size-full object-cover object-top select-none transition-transform duration-300 ease-out group-hover:scale-[1.015]"
                      />
                    )}

                    {/* Subtle hover inspect affordance */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-2.5 bottom-2.5 flex size-8 items-center justify-center rounded-lg bg-zinc-950/75 text-white opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <Expand className="size-3.5" />
                    </span>
                  </button>

                  <figcaption className="mt-3 px-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span className="text-[#FF6B00] dark:text-[#FF8A00] font-semibold">
                        {sample.orderLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{sample.layoutLabel}</span>
                    </div>
                    <h3 className="mt-0.5 text-xs sm:text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1">
                      {sample.title}
                    </h3>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {/* Quiet Footer Spec Line */}
          <div className="mt-6 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Click any screenshot to inspect full-resolution export framing.</span>
            <span className="font-mono tabular-nums text-[11px]">
              1320 × 2868 PNG · App Store &amp; Google Play Ready
            </span>
          </div>
        </div>
      </div>

      {/* Full-Resolution Lightbox Inspector */}
      {activeSample && lightboxIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sample-lightbox-title"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="Close sample preview backdrop"
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm cursor-default"
          />
          <div className="relative z-10 flex w-full max-w-4xl flex-col md:flex-row items-center gap-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close sample preview"
              className="absolute top-3.5 right-3.5 z-10 flex size-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Full Portrait Screenshot */}
            <div className="relative flex shrink-0 items-center justify-center">
              <div className="h-[58vh] sm:h-[68vh] max-h-[620px] aspect-[9/19.5] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#D7FAFC] dark:bg-zinc-900 shadow-lg">
                <img
                  src={activeSample.src}
                  alt={activeSample.alt}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover object-top"
                />
              </div>
            </div>

            {/* Metadata & Navigation Column */}
            <div className="flex flex-1 flex-col justify-between self-stretch py-1 sm:py-3 pr-2 min-w-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span className="text-[#FF6B00] dark:text-[#FF8A00] font-semibold">
                    Slide {activeSample.orderLabel} of 0{STUDIO_SAMPLE_SCREENSHOTS.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSample.layoutLabel}</span>
                </div>

                <h3
                  id="sample-lightbox-title"
                  className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance"
                >
                  {activeSample.title}
                </h3>

                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {activeSample.subtitle}
                </p>

                <dl className="mt-5 divide-y divide-zinc-200/80 dark:divide-zinc-800/80 border-y border-zinc-200/80 dark:border-zinc-800/80 text-xs">
                  <div className="flex items-center justify-between py-2.5 gap-3">
                    <dt className="text-zinc-500 dark:text-zinc-400">Layout Preset</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {activeSample.layoutLabel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 gap-3">
                    <dt className="text-zinc-500 dark:text-zinc-400">Device Frame</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      iPhone 6.9&quot; Titanium Bezel
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5 gap-3">
                    <dt className="text-zinc-500 dark:text-zinc-400">Export Format</dt>
                    <dd className="font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                      1320 × 2868 · sRGB PNG
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 space-y-4">
                {/* Thumbnail Strip Selector */}
                <div className="flex items-center gap-2">
                  {STUDIO_SAMPLE_SCREENSHOTS.map((thumb, idx) => {
                    const selected = idx === lightboxIndex;
                    return (
                      <button
                        key={thumb.id}
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        aria-label={`View slide ${thumb.orderLabel}: ${thumb.title}`}
                        className={`h-14 aspect-[9/19.5] overflow-hidden rounded-md border transition-all cursor-pointer ${
                          selected
                            ? "border-[#FF6B00] ring-2 ring-[#FF6B00]/30 opacity-100"
                            : "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={thumb.src}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="size-full object-cover object-top"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null
                            ? 0
                            : stepSampleIndex(prev, -1, STUDIO_SAMPLE_SCREENSHOTS.length),
                        )
                      }
                      aria-label="Previous sample screenshot"
                      className="h-8.5 px-2.5 text-xs cursor-pointer gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Prev</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null
                            ? 0
                            : stepSampleIndex(prev, 1, STUDIO_SAMPLE_SCREENSHOTS.length),
                        )
                      }
                      aria-label="Next sample screenshot"
                      className="h-8.5 px-2.5 text-xs cursor-pointer gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setLightboxIndex(null);
                      onStartDesigning();
                    }}
                    className="h-8.5 px-4 bg-[#FF6B00] hover:bg-[#FF8A00] text-white text-xs font-semibold cursor-pointer gap-1.5 whitespace-nowrap"
                  >
                    <span>Open in Studio</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
