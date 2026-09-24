import path from "node:path";

import { withPayload } from "@payloadcms/next/withPayload";
import createNextIntlPlugin from "next-intl/plugin";

import {
  IMAGE_DEVICE_SIZES,
  IMAGE_MINIMUM_CACHE_TTL,
  IMAGE_QUALITIES,
} from "./src/lib/constants/imageDelivery.mjs";
import { mediaFileRedirects, mediaRemotePatterns } from "./src/lib/constants/mediaDelivery.mjs";

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
  reactCompiler: true,
  transpilePackages: ["@yoast/search-metadata-previews", "@yoast/components"],
  experimental: {
    inlineCss: true,
  },
  async redirects() {
    return mediaFileRedirects(process.env.BLOB_PUBLIC_BASE_URL);
  },
  images: {
    deviceSizes: [...IMAGE_DEVICE_SIZES],
    localPatterns: [
      { pathname: "**", search: "" },
      { pathname: "/api/media/**" },
      { pathname: "/media/**" },
    ],
    minimumCacheTTL: IMAGE_MINIMUM_CACHE_TTL,
    qualities: [...IMAGE_QUALITIES],
    remotePatterns: mediaRemotePatterns({
      blobBaseUrl: process.env.BLOB_PUBLIC_BASE_URL,
      nodeEnv: process.env.NODE_ENV,
    }),
  },
};

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl(withPayload(nextConfig, { devBundleServerPackages: false }));
