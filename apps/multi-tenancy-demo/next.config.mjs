import { withPayload } from "@payloadcms/next/withPayload";
import { createRequire } from "node:module";
import { dirname, sep } from "node:path";

const require = createRequire(import.meta.url);

// Resolve to package directory. Prefers `pkg/package.json` but falls back to
// scanning the resolved entry path for the node_modules/<pkg> segment, since
// some packages (e.g. @payloadcms/ui) don't expose ./package.json in exports.
const pkgDir = (pkg) => {
  try {
    return dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    const entry = require.resolve(pkg);
    const marker = `${sep}node_modules${sep}${pkg.replace("/", sep)}${sep}`;
    const idx = entry.lastIndexOf(marker);
    if (idx !== -1) {
      return entry.slice(0, idx + marker.length - 1);
    }
    throw new Error(`Cannot find package directory for ${pkg}`);
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    // Force single instances of packages that use React context. Required by the
    // hoisted node_modules layout so admin UI and React resolve to one copy.
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@payloadcms/ui$": pkgDir("@payloadcms/ui"),
      react$: pkgDir("react"),
      "react-dom$": pkgDir("react-dom"),
      "react-dom/client$": require.resolve("react-dom/client"),
      "react/jsx-dev-runtime$": require.resolve("react/jsx-dev-runtime"),
      "react/jsx-runtime$": require.resolve("react/jsx-runtime"),
    };

    return webpackConfig;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
