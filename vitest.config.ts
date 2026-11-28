import { resolve } from "node:path";
import {
  type ConfigEnv,
  defineConfig,
  defineProject,
  mergeConfig,
  type ViteUserConfig,
} from "vitest/config";
import studioViteConfig from "./studio/vite.config.ts";

const ROOT_DIR = import.meta.dirname;
const TEST_ENV: ConfigEnv = {
  command: "serve",
  mode: "test",
  isSsrBuild: false,
  isPreview: false,
};

type PluginEntry = NonNullable<ViteUserConfig["plugins"]>[number];

function stripDevOnlyPlugins(plugins: ViteUserConfig["plugins"]): PluginEntry[] {
  if (!plugins) return [];
  return plugins
    .flatMap((plugin): PluginEntry[] =>
      Array.isArray(plugin) ? stripDevOnlyPlugins(plugin) : [plugin],
    )
    .filter((plugin) => {
      if (!plugin || typeof plugin !== "object" || !("name" in plugin)) return true;
      const name = String(plugin.name);
      return name !== "appassets-api" && !name.startsWith("@tailwindcss/vite");
    });
}

function resolveStudioViteConfig(): ViteUserConfig {
  const base =
    typeof studioViteConfig === "function" ? studioViteConfig(TEST_ENV) : studioViteConfig;
  return {
    plugins: stripDevOnlyPlugins(base.plugins),
    resolve: base.resolve,
    envPrefix: base.envPrefix,
    publicDir: false,
  };
}

const backendProject = defineProject({
  test: {
    name: "backend",
    environment: "node",
    globals: false,
    include: ["src/exec.test.ts", "src/manifest.test.ts", "src/**/*.vitest.test.ts"],
    exclude: ["node_modules/**", "dist/**", "studio/**"],
  },
});

const studioProject = mergeConfig(
  resolveStudioViteConfig(),
  defineProject({
    test: {
      name: "studio",
      environment: "jsdom",
      globals: false,
      setupFiles: [resolve(ROOT_DIR, "studio/src/test/setup.ts")],
      include: ["studio/src/**/*.test.tsx", "studio/src/**/*.vitest.test.ts"],
      exclude: ["node_modules/**", "studio/node_modules/**", "studio/dist/**"],
      css: false,
    },
  }),
);

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["src/exec.ts", "src/manifest.ts", "studio/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "studio/src/test/**"],
      reporter: ["text", "lcov"],
    },
    projects: [backendProject, studioProject],
  },
});
