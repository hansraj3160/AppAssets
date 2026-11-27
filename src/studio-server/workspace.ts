import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { dirname, join, resolve } from "node:path";
import type { StudioApi, StudioPaths } from "./types.ts";

/** Every path the studio touches derives from the config file's location. */
export function studioPaths(configPath: string): StudioPaths {
  const configDir = dirname(resolve(configPath));
  const outDir = join(configDir, "out");
  return {
    configPath: resolve(configPath),
    configDir,
    outDir,
    webDir: join(outDir, "web"),
    designFile: existsSync(join(configDir, "appassets.design.json"))
      ? join(configDir, "appassets.design.json")
      : existsSync(join(configDir, "goldie.design.json"))
        ? join(configDir, "goldie.design.json")
        : join(configDir, "appassets.design.json"), // mirrors designPath() in config.ts
    exportZip: join(outDir, "export.zip"),
  };
}

/**
 * Returns all active config files in the project root directory
 * (both appassets.config.ts and goldie.config.ts if present) to keep them synchronized.
 */
export function getConfigPaths(paths: StudioPaths): string[] {
  const files = new Set<string>();
  if (existsSync(paths.configPath)) files.add(paths.configPath);
  const appassetsCfg = join(paths.configDir, "appassets.config.ts");
  if (existsSync(appassetsCfg)) files.add(appassetsCfg);
  const goldieCfg = join(paths.configDir, "goldie.config.ts");
  if (existsSync(goldieCfg)) files.add(goldieCfg);
  return Array.from(files);
}

/**
 * Extracts and sanitizes the user session identifier from the request:
 * 1. X-Session-ID header
 * 2. appassets_session_id cookie
 * 3. ?sessionId= query parameter
 * Returns "default" if absent or invalid.
 */
export function getSessionIdFromRequest(req?: IncomingMessage | null): string {
  if (!req) return "default";
  const headers = req.headers || {};

  // 1. Header
  const headerSid = headers["x-session-id"];
  if (typeof headerSid === "string" && headerSid.trim()) {
    const clean = headerSid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (clean) return clean;
  }

  // 2. Cookie
  const cookieHeader = headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )appassets_session_id=([^;]*)/);
    if (match?.[1]) {
      try {
        const clean = decodeURIComponent(match[1])
          .replace(/[^a-zA-Z0-9_-]/g, "")
          .slice(0, 64);
        if (clean) return clean;
      } catch {}
    }
  }

  // 3. Query Param
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const querySid = url.searchParams.get("sessionId");
    if (querySid?.trim()) {
      const clean = querySid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
      if (clean) return clean;
    }
  } catch {}

  return "default";
}

/**
 * Resolves isolated paths for a specific user/guest session workspace.
 * If sessionId is "default", returns the shared base project paths.
 */
export function resolveWorkspacePaths(api: StudioApi, sessionId: string): StudioPaths {
  if (!sessionId || sessionId === "default") {
    return api.paths;
  }
  const workspaceDir = join(api.paths.configDir, "workspaces", sessionId);
  const outDir = join(workspaceDir, "out");
  return {
    configPath: join(workspaceDir, "appassets.config.ts"),
    configDir: workspaceDir,
    outDir,
    webDir: join(outDir, "web"),
    designFile: join(workspaceDir, "appassets.design.json"),
    exportZip: join(outDir, "export.zip"),
  };
}

/**
 * Ensures that a session's workspace has a valid config file and required assets.
 */
export async function ensureWorkspaceConfig(
  basePaths: StudioPaths,
  wsPaths: StudioPaths,
): Promise<void> {
  await mkdir(wsPaths.configDir, { recursive: true });
  await mkdir(wsPaths.outDir, { recursive: true });
  await mkdir(wsPaths.webDir, { recursive: true });

  if (!existsSync(wsPaths.configPath)) {
    if (existsSync(basePaths.configPath)) {
      let baseContent = await readFile(basePaths.configPath, "utf8");
      const srcConfigAbs = resolve(basePaths.configDir, "src", "config.ts");
      baseContent = baseContent.replace(
        /import\s+type\s+\{([^}]+)\}\s+from\s+["']\.\/src\/config(?:\.ts)?["'];?/,
        `import type {$1} from ${JSON.stringify(srcConfigAbs)};`,
      );
      const scenesIdx = baseContent.indexOf("scenes:");
      if (scenesIdx !== -1) {
        const openBracket = baseContent.indexOf("[", scenesIdx);
        if (openBracket !== -1) {
          let depth = 0;
          let closeBracket = -1;
          for (let i = openBracket; i < baseContent.length; i++) {
            if (baseContent[i] === "[") depth++;
            else if (baseContent[i] === "]") {
              depth--;
              if (depth === 0) {
                closeBracket = i;
                break;
              }
            }
          }
          if (closeBracket !== -1) {
            baseContent = `${baseContent.slice(0, openBracket + 1)}\n  ${baseContent.slice(closeBracket)}`;
          }
        }
      }
      await writeFile(wsPaths.configPath, baseContent);
    }
  }

  const baseAssets = join(basePaths.configDir, "assets");
  const wsAssets = join(wsPaths.configDir, "assets");
  if (!existsSync(wsAssets) && existsSync(baseAssets)) {
    try {
      await symlink(baseAssets, wsAssets);
    } catch {
      await cp(baseAssets, wsAssets, { recursive: true });
    }
  }
}

/**
 * Prunes inactive guest workspaces older than maxGuestAgeMs (default 48h).
 */
export async function pruneOldWorkspaces(
  workspacesDir: string,
  maxGuestAgeMs = 48 * 3600 * 1000,
): Promise<void> {
  if (!existsSync(workspacesDir)) return;
  try {
    const entries = await readdir(workspacesDir, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const wsPath = join(workspacesDir, entry.name);
      try {
        const stats = await stat(wsPath);
        const age = now - stats.mtimeMs;
        const isGuest = entry.name.startsWith("guest_");
        const maxAge = isGuest ? maxGuestAgeMs : 30 * 24 * 3600 * 1000;
        if (age > maxAge) {
          await rm(wsPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
}
