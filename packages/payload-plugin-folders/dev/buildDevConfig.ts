import { foldersPlugin } from "@focus-reactive/payload-plugin-folders";
import type { FoldersPluginOptions } from "@focus-reactive/payload-plugin-folders";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { de } from "@payloadcms/translations/languages/de";
import { en } from "@payloadcms/translations/languages/en";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import type { Access, CollectionConfig, Config } from "payload";

import {
  adminOnlyRepair,
  folderCreateAccess,
  folderDeleteAccess,
  folderUpdateAccess,
  publicReadsAll,
  publicReadsPublished,
} from "./access/roles.js";
import { Pages } from "./collections/Pages.js";
import { Posts } from "./collections/Posts.js";
import { Users } from "./collections/Users.js";
import { devUser } from "./helpers/credentials.js";
import { ensureDevAdmin } from "./helpers/ensureDevAdmin.js";
import { testEmailAdapter } from "./helpers/testEmailAdapter.js";
import { mcpPluginOptions } from "./mcpPluginOptions.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// The payload CLI (generate:importmap) finds the app directory through ROOT_DIR.
process.env.ROOT_DIR ??= dirname;

const isProduction = process.env.NODE_ENV === "production";

export type DevConfigOptions = {
  /** Log into the admin as the dev user without a form. Defaults to on outside production. */
  autoLogin?: boolean;
  /** Collections added after the dev app's own; tests use them for probes the plugin does not own. */
  extraCollections?: CollectionConfig[];
  /** Replaces the default SQLite adapter; the integration tests pass a per-file database here. */
  db?: Config["db"];
  /** False builds the app without localization; tests use it to cover the plain-column shapes. */
  localized?: boolean;
  /**
   * Lets a visitor read published pages and posts, as the frontend example (`dev/app/(frontend)`)
   * needs. Off by default: the integration tests rely on pages a reader cannot see, and only the
   * dev server (`dev/payload.config.ts`) turns it on.
   */
  publicReads?: boolean;
  /** The collections `@payloadcms/plugin-redirects` may reference; default pages and posts. */
  redirectsCollections?: string[];
  /**
   * Adds `@payloadcms/plugin-mcp` (find, create, update, delete on folders, pages and posts at
   * `/api/mcp`) and gives users an API key to call it with. Off by default; only the dev server
   * (`dev/payload.config.ts`) turns it on, through `FOLDERS_MCP=true`.
   */
  mcp?: boolean;
  /** Merged over the dev app's plugin options. */
  foldersOptions?: Partial<FoldersPluginOptions>;
  /**
   * Turns the trash on for the pages and posts collections, so deletes are soft; `pagesOnly` turns
   * it on for pages alone, which leaves the folders without a trash and the delete permanent
   * (tests only).
   */
  trash?: boolean | "pagesOnly";
};

const withPublicRead = (
  collection: CollectionConfig,
  read: Access,
  isOn: boolean
): CollectionConfig =>
  isOn ? { ...collection, access: { ...collection.access, read } } : collection;

export const buildDevConfig = ({
  autoLogin = !isProduction,
  db = sqliteAdapter({
    // Several processes open the file (the server, the process that prepares static paths, a
    // second dev server, the seed), and each starts by writing to it. Without a wait, a reader that
    // meets another process's write fails at once with SQLITE_BUSY and the page answers 500.
    busyTimeout: 10_000,
    client: { url: process.env.DATABASE_URI || `file:${path.resolve(dirname, "dev.db")}` },
    // Without transactionOptions the SQLite adapter's transactions are no-ops and a failed move
    // would leave half its writes behind.
    transactionOptions: {},
    // The end-to-end run turns this on: in WAL mode a reader is not blocked by a write. It is off
    // otherwise so that `dev.db` does not grow -wal and -shm files beside it.
    wal: process.env.FOLDERS_SQLITE_WAL === "true",
  }),
  extraCollections = [],
  foldersOptions,
  localized = true,
  mcp = false,
  publicReads = false,
  redirectsCollections = ["pages", "posts"],
  trash = false,
}: DevConfigOptions = {}) =>
  buildConfig({
    admin: {
      autoLogin: autoLogin ? { email: devUser.email, password: devUser.password } : false,
      // The e2e servers for `treeView: false` and `confirmMoves` must not rewrite the committed import map without the
      // tree view's entry while the main server reads it.
      importMap: {
        autoGenerate:
          process.env.FOLDERS_TREE_VIEW !== "false" &&
          process.env.FOLDERS_CONFIRM_MOVES === undefined &&
          process.env.FOLDERS_TRAILING_SLASH === undefined,
        baseDir: dirname,
      },
      user: "users",
    },
    collections: [
      withPublicRead(trash ? { ...Pages, trash: true } : Pages, publicReadsPublished, publicReads),
      withPublicRead(
        trash === true ? { ...Posts, trash: true } : Posts,
        publicReadsAll,
        publicReads
      ),
      // The plugin authenticates a request as a user, and a user signs in with an API key only when
      // the collection asks for one.
      mcp ? { ...Users, auth: { useAPIKey: true } } : Users,
      ...extraCollections,
    ],
    db,
    email: testEmailAdapter,
    // German is an admin language only when `FOLDERS_ADMIN_GERMAN=true`, so the plugin's German
    // strings can be seen on screen; without it the dev admin stays English-only. The language
    // follows the browser's Accept-Language, so the flag changes nothing for an English browser.
    ...(process.env.FOLDERS_ADMIN_GERMAN === "true"
      ? { i18n: { supportedLanguages: { de, en } } }
      : {}),
    ...(localized
      ? { localization: { defaultLocale: "en", fallback: true, locales: ["en", "de"] } }
      : {}),
    onInit: async (payload) => {
      if (autoLogin) {
        await ensureDevAdmin(payload);
      }
    },
    plugins: [
      foldersPlugin({
        collections: { pages: true, posts: { label: "Blog post" } },
        ...foldersOptions,
        access: { repair: adminOnlyRepair, ...foldersOptions?.access },
        folders: {
          ...foldersOptions?.folders,
          access: {
            create: folderCreateAccess,
            delete: folderDeleteAccess,
            update: folderUpdateAccess,
            ...foldersOptions?.folders?.access,
          },
        },
      }),
      redirectsPlugin({ collections: redirectsCollections }),
      ...(mcp ? [mcpPlugin(mcpPluginOptions())] : []),
    ],
    secret: process.env.PAYLOAD_SECRET || "dev-secret-not-for-production",
    typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  });
