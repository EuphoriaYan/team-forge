import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@team-forge/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"]
  }
});
