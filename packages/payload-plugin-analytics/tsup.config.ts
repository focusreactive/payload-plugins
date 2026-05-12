/// <reference types="node" />

import { defineConfig } from "tsup";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";

const compileCss = () =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      "node",
      ["node_modules/postcss-cli/index.js", "src/components/AnalyticsView/admin.css", "-o", "dist/admin.css"],
      { stdio: "inherit", shell: false },
    );

    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`postcss exited ${code}`));
        return;
      }

      try {
        mkdirSync("dist/components/AnalyticsView", { recursive: true });
        copyFileSync("dist/admin.css", "dist/components/AnalyticsView/admin.css");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}"],
  bundle: false,
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  external: [
    "payload",
    "react",
    "react-dom",
    "next",
    "@payloadcms/ui",
    "@payloadcms/next",
    "@payloadcms/next/templates",
    "lucide-react",
    "recharts",
    "react-day-picker",
    "clsx",
  ],
  async onSuccess() {
    await compileCss();
  },
});
