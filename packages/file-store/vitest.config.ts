import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@team-forge/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node"
  }
});
