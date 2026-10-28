import { foldersPlugin } from "@focus-reactive/payload-plugin-folders";
import type { FoldersPluginOptions } from "@focus-reactive/payload-plugin-folders";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import type { Config } from "payload";

import { Pages } from "./collections/Pages.js";
import { Posts } from "./collections/Posts.js";
import { Users } from "./collections/Users.js";
import { devUser } from "./helpers/credentials.js";
import { ensureDevAdmin } from "./helpers/ensureDevAdmin.js";
import { testEmailAdapter } from "./helpers/testEmailAdapter.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// The payload CLI (generate:importmap) finds the app directory through ROOT_DIR.
process.env.ROOT_DIR ??= dirname;

const isProduction = process.env.NODE_ENV === "production";

export type DevConfigOptions = {
  /** Log into the admin as the dev user without a form. Defaults to on outside production. */
  autoLogin?: boolean;
  /** Replaces the default SQLite adapter; the integration tests pass a per-file database here. */
  db?: Config["db"];
  /** Merged over the dev app's plugin options. */
  foldersOptions?: Partial<FoldersPluginOptions>;
};

export const buildDevConfig = ({
  autoLogin = !isProduction,
  db = sqliteAdapter({
    client: { url: process.env.DATABASE_URI || `file:${path.resolve(dirname, "dev.db")}` },
    // Without transactionOptions the SQLite adapter's transactions are no-ops and a failed move
    // would leave half its writes behind.
    transactionOptions: {},
  }),
  foldersOptions,
}: DevConfigOptions = {}) =>
  buildConfig({
    admin: {
      autoLogin: autoLogin ? { email: devUser.email, password: devUser.password } : false,
      importMap: { baseDir: dirname },
      user: "users",
    },
    collections: [Pages, Posts, Users],
    db,
    email: testEmailAdapter,
    localization: { defaultLocale: "en", fallback: true, locales: ["en", "de"] },
    onInit: async (payload) => {
      if (autoLogin) {
        await ensureDevAdmin(payload);
      }
    },
    plugins: [
      foldersPlugin({
        collections: { pages: true, posts: { label: "Blog post" } },
        ...foldersOptions,
      }),
      redirectsPlugin({ collections: ["pages", "posts"] }),
    ],
    secret: process.env.PAYLOAD_SECRET || "dev-secret-not-for-production",
    typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  });
