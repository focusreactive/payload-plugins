import path from "node:path";
import { fileURLToPath } from "node:url";

import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = import.meta.dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Your Next.js config here
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    return webpackConfig;
  },
  experimental: {
    inlineCss: true,
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/api/media/**",
        port: "3000",
        protocol: "http",
      },
      {
        hostname: "localhost",
        pathname: "/api/media/**",
        port: "3333",
        protocol: "http",
      },
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "payload-cms-ideal-cms.com",
        protocol: "https",
      },
      {
        hostname: "payload-cms-ideal-cms.vercel.app",
        protocol: "https",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(
  withPayload(nextConfig, { devBundleServerPackages: false })
);
