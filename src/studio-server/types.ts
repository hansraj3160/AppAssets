import type { IncomingMessage, ServerResponse } from "node:http";

export type StudioPaths = {
  configPath: string;
  configDir: string;
  outDir: string;
  webDir: string;
  designFile: string;
  exportZip: string;
};

export type ExportTargets = {
  iphone?: boolean;
  ipad?: boolean;
  googlePlay?: boolean;
  marketing?: boolean;
  guidelines?: boolean;
};

export type ExportOptions = {
  background?: string;
  frame?: string;
  font?: string;
  template?: string;
  layout?: string;
  screenOnly?: boolean;
  fontSizeScale?: number;
  targets?: ExportTargets;
  selectedScenes?: string[];
};

export type StudioApi = {
  paths: StudioPaths;
  /** Command prefix that runs the goldie CLI, e.g. ["node", ".../dist/cli.js"]. */
  cli: string[];
};

export type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export type PresetLocale = {
  code: string;
  label: string;
  rtl: boolean;
};

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};
