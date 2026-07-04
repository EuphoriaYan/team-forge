import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@team-forge/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 5173
  }
});
