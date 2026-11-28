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
