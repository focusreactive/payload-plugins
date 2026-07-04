/// <reference types="node" />

import { defineConfig } from "tsup";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { transformDistDirectory } from "./scripts/prefix-classes";
import { verifyCss, verifyJs } from "./scripts/verify-dist";

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
  clean: ["dist/**/*.js", "dist/**/*.map", "dist/**/*.d.ts"],
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
    const changed = transformDistDirectory("dist");
    console.log(`[prefix-classes] prefixed class literals in ${changed} files`);

    await compileCss();

    const errors = verifyCss(readFileSync("dist/admin.css", "utf-8"));
    for (const entry of readdirSync("dist", { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".js")) {
        const filePath = join(entry.parentPath, entry.name);
        errors.push(...verifyJs(readFileSync(filePath, "utf-8"), filePath));
      }
    }

    if (errors.length > 0) {
      throw new Error(`[verify-dist] style isolation regressed:\n- ${errors.join("\n- ")}`);
    }
  },
});
