/// <reference types="node" />

import { defineConfig } from "tsup";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";

const runPostcss = (input: string, output: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("node", ["node_modules/postcss-cli/index.js", input, "-o", output], {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`postcss exited ${code} for ${input}`));
        return;
      }
      resolve();
    });
  });

const compileCss = async () => {
  await runPostcss("src/components/AnalyticsView/admin.css", "dist/admin.css");
  mkdirSync("dist/components/AnalyticsView", { recursive: true });
  copyFileSync("dist/admin.css", "dist/components/AnalyticsView/admin.css");
};

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}"],
  bundle: false,
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ["payload", "react", "react-dom", "next", "@payloadcms/ui", "@payloadcms/next", "@payloadcms/next/templates", "lucide-react", "recharts", "react-day-picker", "clsx"],
  async onSuccess() {
    await compileCss();
  },
});
