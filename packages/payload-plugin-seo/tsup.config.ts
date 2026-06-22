/// <reference types="node" />

import { defineConfig } from "tsup";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const postcssCli = createRequire(import.meta.url).resolve("postcss-cli");

const compileCss = () =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      "node",
      [postcssCli, "src/admin.css", "-o", "dist/admin.css", "--use", "@tailwindcss/postcss"],
      {
        stdio: "inherit",
        shell: false,
      }
    );

    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`postcss exited ${code}`));
        return;
      }
      resolve();
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
    "@payloadcms/richtext-lexical",
    "lucide-react",
    "clsx",
    "tailwind-merge",
    "yoastseo",
    "@yoast/search-metadata-previews",
  ],
  async onSuccess() {
    await compileCss();
  },
});
