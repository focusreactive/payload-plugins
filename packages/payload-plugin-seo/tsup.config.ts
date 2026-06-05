/// <reference types="node" />

import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";

const copyCss = () => {
  const source = "src/components/SeoDrawer/admin.css";
  mkdirSync("dist/components/SeoDrawer", { recursive: true });
  copyFileSync(source, "dist/components/SeoDrawer/admin.css");
  copyFileSync(source, "dist/admin.css");
};

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
    copyCss();
  },
});
