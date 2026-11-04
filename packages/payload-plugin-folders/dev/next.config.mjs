import { withPayload } from "@payloadcms/next/withPayload";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The e2e test for `admin.treeView: false` runs a second dev server beside the first one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The e2e test for `urls.trailingSlash` runs a second server with this set, so Next redirects
  // to the same URL form the plugin hands out.
  trailingSlash: process.env.FOLDERS_TRAILING_SLASH === "true",
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    return webpackConfig;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
