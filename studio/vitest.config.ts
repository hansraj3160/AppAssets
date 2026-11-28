import { resolve } from "node:path";
import { type ConfigEnv, defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

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

const resolvedViteConfig = typeof viteConfig === "function" ? viteConfig(TEST_ENV) : viteConfig;

export default mergeConfig(
  {
    plugins: stripDevOnlyPlugins(resolvedViteConfig.plugins),
    resolve: resolvedViteConfig.resolve,
    envPrefix: resolvedViteConfig.envPrefix,
    publicDir: false,
  },
  defineConfig({
    test: {
      environment: "jsdom",
      globals: false,
      setupFiles: [resolve(import.meta.dirname, "src/test/setup.ts")],
      include: ["src/**/*.test.tsx", "src/**/*.vitest.test.ts"],
      css: false,
    },
  }),
);
