import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

test("repository standardises on a single root bun.lock with no conflicting lockfiles", () => {
  assert.equal(existsSync(path.join(ROOT_DIR, "bun.lock")), true, "Root bun.lock must exist");

  const forbiddenLockfiles = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "studio/bun.lock",
    "studio/package-lock.json",
    "studio/yarn.lock",
    "studio/pnpm-lock.yaml",
  ];

  for (const relPath of forbiddenLockfiles) {
    assert.equal(
      existsSync(path.join(ROOT_DIR, relPath)),
      false,
      `Conflicting lockfile must not exist: ${relPath}`,
    );
  }
});

test("root package.json pins Bun packageManager, declares studio workspace, and avoids npm script drift", () => {
  const pkg = JSON.parse(readRepoFile("package.json")) as {
    packageManager?: string;
    workspaces?: string[];
    scripts?: Record<string, string>;
  };

  assert.match(
    pkg.packageManager ?? "",
    /^bun@\d+\.\d+\.\d+$/,
    "packageManager must be pinned to an exact bun@x.y.z version",
  );
  assert.ok(
    Array.isArray(pkg.workspaces) && pkg.workspaces.includes("studio"),
    'workspaces must include "studio"',
  );

  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    assert.equal(
      /\bnpm\s+(run|exec|install|ci)\b/.test(script),
      false,
      `Script "${name}" should use bun rather than npm: ${script}`,
    );
  }
});

test("Dockerfile enforces single frozen workspace install without wildcard lockfile", () => {
  const dockerfile = readRepoFile("Dockerfile");

  assert.match(dockerfile, /^COPY package\.json bun\.lock \.\//m);
  assert.equal(dockerfile.includes("bun.lock*"), false, "Dockerfile must not wildcard bun.lock*");
  assert.match(dockerfile, /^RUN bun install --frozen-lockfile$/m);
  assert.equal(
    /^RUN bun install\s*$/m.test(dockerfile),
    false,
    "Dockerfile must not run unfrozen bun install",
  );
  assert.equal(
    dockerfile.includes("cd studio && bun install"),
    false,
    "Dockerfile must install workspaces from root lockfile, not cd studio",
  );
});

test("CI workflow enforces bun install --frozen-lockfile and pins Bun version across all jobs", () => {
  const ciYml = readRepoFile(".github/workflows/ci.yml");

  const frozenMatches = ciYml.match(/run:\s*bun install --frozen-lockfile\b/g) ?? [];
  assert.equal(
    frozenMatches.length,
    3,
    "quality, test, and build jobs must each run bun install --frozen-lockfile",
  );

  assert.equal(
    /run:\s*bun install\s*$/m.test(ciYml),
    false,
    "CI workflow must not contain unfrozen bun install",
  );
  assert.equal(
    ciYml.includes("cd studio && bun install"),
    false,
    "CI workflow must not run separate studio bun install",
  );
  assert.equal(
    /bun-version:\s*latest\b/.test(ciYml),
    false,
    "CI workflow must pin bun-version instead of latest",
  );
});

test("deploy script enforces bun install --frozen-lockfile", () => {
  const deploySh = readRepoFile("scripts/deploy.sh");

  assert.match(deploySh, /^bun install --frozen-lockfile$/m);
  assert.equal(
    /^bun install\s*$/m.test(deploySh),
    false,
    "deploy.sh must not run unfrozen bun install",
  );
});

test(".gitignore ignores competing and nested lockfiles", () => {
  const gitignore = readRepoFile(".gitignore");

  for (const pattern of ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "studio/bun.lock"]) {
    assert.ok(
      gitignore.split(/\r?\n/).includes(pattern),
      `.gitignore must include ${pattern}`,
    );
  }
});

test(".dockerignore excludes bloat, docs, tests, AI agent dirs, compose files, and duplicate/unbuilt assets", () => {
  const lines = readRepoFile(".dockerignore")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const requiredPatterns = [
    "node_modules",
    "**/node_modules",
    ".git",
    ".github",
    "*.md",
    "**/*.md",
    "**/*.test.ts",
    "**/*.test.tsx",
    ".agents",
    ".claude*",
    "docker-compose.yml",
    "public",
    "assets/fonts/*.otf",
    "assets/fonts/*.ttf",
    "firebase-cdn",
  ];

  for (const pattern of requiredPatterns) {
    assert.ok(lines.includes(pattern), `.dockerignore must exclude ${pattern}`);
  }

  // Ensure build-critical files/folders are never accidentally excluded
  const forbiddenExclusions = [
    "bun.lock",
    "package.json",
    "studio/package.json",
    "studio/public",
    "assets",
    "src",
    "appassets.config.example.ts",
  ];

  for (const criticalPath of forbiddenExclusions) {
    assert.equal(
      lines.includes(criticalPath),
      false,
      `.dockerignore must NOT exclude build-critical path: ${criticalPath}`,
    );
  }
});

test("Dockerfile ships production-only node_modules via dedicated prod-deps stage", () => {
  const dockerfile = readRepoFile("Dockerfile");

  assert.match(dockerfile, /^RUN bun install --frozen-lockfile --production$/m);
  assert.match(dockerfile, /^COPY --from=prod-deps \/app\/node_modules \.\/node_modules$/m);
});

test("M-2: studio/index.html stays under 5 KB with no eager blocking ad or analytics tags", () => {
  const html = readRepoFile("studio/index.html");
  const bytes = Buffer.byteLength(html, "utf8");

  assert.ok(bytes < 5120, `studio/index.html must be under 5 KB, got ${bytes} bytes`);
  assert.equal(
    html.includes("googletagmanager.com"),
    false,
    "studio/index.html must not eagerly load gtag.js (analytics.ts defers it to idle)",
  );
  assert.equal(
    html.includes("googlesyndication.com"),
    false,
    "studio/index.html must not eagerly load adsbygoogle.js (AdBanner.tsx defers it to idle)",
  );
  assert.equal(
    /<script(?![^>]*\bsrc=)/i.test(html),
    false,
    "studio/index.html must not contain blocking inline <script> blocks",
  );
  assert.match(html, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
});

test("M-3: backend and frontend share single canonical src/manifest-schema.ts without duplicate definitions", () => {
  assert.equal(
    existsSync(path.join(ROOT_DIR, "src/manifest-schema.ts")),
    true,
    "src/manifest-schema.ts must exist as the single source of truth",
  );

  const sharedSchema = readRepoFile("src/manifest-schema.ts");
  assert.equal(
    sharedSchema.includes("node:"),
    false,
    "src/manifest-schema.ts must stay browser-safe with zero node:* imports",
  );

  const backendManifest = readRepoFile("src/manifest.ts");
  const frontendManifest = readRepoFile("studio/src/manifest.ts");

  assert.match(backendManifest, /from "\.\/manifest-schema\.ts"/);
  assert.match(frontendManifest, /from "\.\.\/\.\.\/src\/manifest-schema"/);
  assert.equal(
    /export type StoreManifest\s*=\s*\{/.test(frontendManifest),
    false,
    "studio/src/manifest.ts must re-export StoreManifest from src/manifest-schema.ts instead of duplicating it",
  );
  assert.equal(
    /export type Theme\s*=\s*\{/.test(frontendManifest),
    false,
    "studio/src/manifest.ts must re-export Theme from src/manifest-schema.ts instead of duplicating it",
  );
});

test("M-4: static pages, StudioWorkspace, and heavy modals are code-split with React.lazy()", () => {
  const publicRoutes = readRepoFile("studio/src/components/PublicRoutes.tsx");
  for (const page of [
    "PrivacyPolicy",
    "TermsAndConditions",
    "Guidelines",
    "AboutUs",
    "ContactUs",
    "LandingPage",
  ]) {
    assert.match(
      publicRoutes,
      new RegExp(`const ${page}\\s*=\\s*lazy\\(`),
      `PublicRoutes.tsx must lazy-load ${page}`,
    );
  }

  const appTsx = readRepoFile("studio/src/App.tsx");
  assert.match(appTsx, /const StudioWorkspace\s*=\s*lazy\(/);

  const stripTsx = readRepoFile("studio/src/components/Strip.tsx");
  assert.match(stripTsx, /const AiCopyModal\s*=\s*lazy\(/);

  const appDetailsTsx = readRepoFile("studio/src/components/AppDetailsModal.tsx");
  assert.match(appDetailsTsx, /const AppIconModal\s*=\s*lazy\(/);

  const studioWorkspaceTsx = readRepoFile("studio/src/components/StudioWorkspace.tsx");
  assert.match(studioWorkspaceTsx, /const LocaleManagerModal\s*=\s*lazy\(/);

  const headerTsx = readRepoFile("studio/src/components/Header.tsx");
  assert.match(headerTsx, /const StoreAuditModal\s*=\s*lazy\(/);
});


