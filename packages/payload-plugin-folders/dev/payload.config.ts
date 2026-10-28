import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import path from "node:path";
import { buildConfig } from "payload";
import type { Config, Payload } from "payload";
import { fileURLToPath } from "node:url";

import { foldersPlugin } from "../src/index.js";
import { Pages } from "./collections/Pages.js";
import { Posts } from "./collections/Posts.js";
import { Users } from "./collections/Users.js";
import { devUser } from "./helpers/credentials.js";
import { testEmailAdapter } from "./helpers/testEmailAdapter.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname;
}

const isProduction = process.env.NODE_ENV === "production";

export type DevConfigOptions = {
  /** Log into the admin as the dev user without a form. Defaults to on outside production. */
  autoLogin?: boolean;
  /** Replaces the default SQLite adapter; the integration tests pass a per-file database here. */
  db?: Config["db"];
};

const ensureDevAdmin = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: "users",
    overrideAccess: true,
    where: { email: { equals: devUser.email } },
  });

  if (totalDocs === 0) {
    await payload.create({
      collection: "users",
      data: { ...devUser, role: "admin" },
      overrideAccess: true,
    });
  }
};

export const buildDevConfig = ({
  autoLogin = !isProduction,
  db = sqliteAdapter({
    client: { url: process.env.DATABASE_URI || `file:${path.resolve(dirname, "dev.db")}` },
    // Without transactionOptions the SQLite adapter's transactions are no-ops and a failed move
    // would leave half its writes behind.
    transactionOptions: {},
  }),
}: DevConfigOptions = {}) =>
  buildConfig({
    admin: {
      autoLogin: autoLogin ? { email: devUser.email, password: devUser.password } : false,
      importMap: { baseDir: path.resolve(dirname) },
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
      foldersPlugin({ collections: { pages: true, posts: { label: "Blog post" } } }),
      redirectsPlugin({ collections: ["pages", "posts"] }),
    ],
    secret: process.env.PAYLOAD_SECRET || "dev-secret-not-for-production",
    typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  });

export default buildDevConfig();
