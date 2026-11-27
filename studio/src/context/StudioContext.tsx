import { createContext, useContext } from "react";
import type { Platform } from "../lib/studioState";

export interface StudioActions {
  refresh: () => Promise<void>;
  toast: (message: string) => void;
}

export interface StudioViewportState {
  platform: Platform;
  device: string;
  locale: string;
  dark: boolean;
  setPlatform: (platform: Platform) => void;
  setDevice: (device: string) => void;
  setLocale: (locale: string) => void;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export interface StudioUiState {
  canvasView: "editor" | "store" | "promo";
  setCanvasView: (view: "editor" | "store" | "promo") => void;
  isLocaleModalOpen: boolean;
  setIsLocaleModalOpen: (open: boolean) => void;
  isAppDetailsModalOpen: boolean;
  setIsAppDetailsModalOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
}

export const StudioActionsContext = createContext<StudioActions | null>(null);
export const StudioViewportContext = createContext<StudioViewportState | null>(null);
export const StudioUiContext = createContext<StudioUiState | null>(null);

export function useStudioActions(): StudioActions | null {
  return useContext(StudioActionsContext);
}

export function useStudioViewport(): StudioViewportState | null {
  return useContext(StudioViewportContext);
}

export function useStudioUi(): StudioUiState | null {
  return useContext(StudioUiContext);
}
