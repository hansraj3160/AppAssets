export interface AppIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon?: string | null;
  appName?: string;
  onApplyIcon: (dataUrl: string) => Promise<void> | void;
}

export type IconPreviewMode = "google-play" | "apple-ios" | "master-square" | "home-screen";

export interface BgPreset {
  id: string;
  label: string;
  value: string;
  type: "gradient" | "solid";
  isDarkText?: boolean;
}

export const BG_PRESETS: BgPreset[] = [
  {
    id: "store-blue",
    label: "App Store Blue",
    value: "linear-gradient(135deg, #007aff 0%, #0051d5 100%)",
    type: "gradient",
  },
  {
    id: "dark-obsidian",
    label: "Dark Obsidian",
    value: "linear-gradient(135deg, #1f2937 0%, #0f172a 100%)",
    type: "gradient",
  },
  {
    id: "indigo-glow",
    label: "Indigo Glow",
    value: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    type: "gradient",
  },
  {
    id: "royal-violet",
    label: "Royal Violet",
    value: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    type: "gradient",
  },
  {
    id: "emerald-mint",
    label: "Emerald Mint",
    value: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    type: "gradient",
  },
  {
    id: "sunset-blaze",
    label: "Sunset Blaze",
    value: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    type: "gradient",
  },
  {
    id: "crisp-silver",
    label: "Crisp Silver",
    value: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    type: "gradient",
    isDarkText: true,
  },
  {
    id: "solid-white",
    label: "Pure White",
    value: "#ffffff",
    type: "solid",
    isDarkText: true,
  },
  {
    id: "solid-black",
    label: "Solid Black",
    value: "#000000",
    type: "solid",
  },
  {
    id: "solid-blue",
    label: "Solid Blue",
    value: "#007aff",
    type: "solid",
  },
  {
    id: "solid-emerald",
    label: "Solid Green",
    value: "#10b981",
    type: "solid",
  },
  {
    id: "solid-amber",
    label: "Solid Amber",
    value: "#f59e0b",
    type: "solid",
  },
];

export interface MasterIconRenderOptions {
  targetSize: number;
  iconSrc: string | null;
  bgType: "preset" | "custom" | "transparent";
  activeBackground: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  cornerRadius: number;
  clipCornersOnExport: boolean;
}

/**
 * High-resolution offscreen canvas renderer for exporting 512x512 and 1024x1024 PNGs.
 * Clips to cornerRadius when enabled so the exported PNG actually has rounded corners.
 */
export function renderMasterIconCanvas({
  targetSize,
  iconSrc,
  bgType,
  activeBackground,
  scale,
  offsetX,
  offsetY,
  cornerRadius,
  clipCornersOnExport,
}: MasterIconRenderOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Could not initialize 2D context"));

    const effectiveRadius = clipCornersOnExport ? cornerRadius : 0;
    if (effectiveRadius > 0) {
      const radiusPx = (effectiveRadius / 100) * targetSize;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(0, 0, targetSize, targetSize, radiusPx);
      } else {
        const r = radiusPx;
        ctx.moveTo(r, 0);
        ctx.lineTo(targetSize - r, 0);
        ctx.quadraticCurveTo(targetSize, 0, targetSize, r);
        ctx.lineTo(targetSize, targetSize - r);
        ctx.quadraticCurveTo(targetSize, targetSize, targetSize - r, targetSize);
        ctx.lineTo(r, targetSize);
        ctx.quadraticCurveTo(0, targetSize, 0, targetSize - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
      }
      ctx.clip();
    }

    if (bgType !== "transparent") {
      if (activeBackground.startsWith("linear-gradient")) {
        const grad = ctx.createLinearGradient(0, 0, targetSize, targetSize);
        const colorMatches = activeBackground.match(/#[0-9a-fA-F]{6}|rgba?\([^)]+\)/g);
        if (colorMatches && colorMatches.length >= 2) {
          grad.addColorStop(0, colorMatches[0]!);
          grad.addColorStop(1, colorMatches[1]!);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = "#007aff";
        }
      } else {
        ctx.fillStyle = activeBackground;
      }
      ctx.fillRect(0, 0, targetSize, targetSize);
    }

    if (!iconSrc) {
      resolve(canvas.toDataURL("image/png"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const factor = scale / 100;
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = targetSize * factor;
      let drawH = targetSize * factor;

      if (aspect > 1) {
        drawH = drawW / aspect;
      } else if (aspect < 1) {
        drawW = drawH * aspect;
      }

      const drawX = (targetSize - drawW) / 2 + (offsetX / 100) * drawW;
      const drawY = (targetSize - drawH) / 2 + (offsetY / 100) * drawH;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load icon image"));
    img.src = iconSrc;
  });
}
