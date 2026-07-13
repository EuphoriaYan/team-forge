import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@team-forge/core/work-item",
        replacement: fileURLToPath(new URL("../core/src/work-item.ts", import.meta.url))
      },
      {
        find: "@team-forge/core",
        replacement: fileURLToPath(new URL("../core/src/index.ts", import.meta.url))
      }
    ]
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node"
  }
});
