import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { Authors } from "./collections/Authors";
import { Categories } from "./collections/Categories";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Users } from "./collections/Users";
import { SiteSettings } from "./globals/SiteSettings";
import { DEFAULT_LOCALE, LOCALES } from "./lib/locales";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    importMap: { baseDir },
    livePreview: {
      breakpoints: [
        { label: "Mobile", name: "mobile", width: 390, height: 844 },
        { label: "Tablet", name: "tablet", width: 768, height: 1024 },
        { label: "Desktop", name: "desktop", width: 1280, height: 1100 },
      ],
    },
    user: Users.slug,
  },
  collections: [Users, Media, Authors, Categories, Posts, Pages],
  db: postgresAdapter({
    migrationDir: path.resolve(baseDir, "migrations"),
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL ?? "",
    },
  }),
  editor: lexicalEditor(),
  globals: [SiteSettings],
  localization: {
    defaultLocale: DEFAULT_LOCALE,
    fallback: true,
    locales: LOCALES.map((code) => ({ code, label: code === "en" ? "English" : "Spanish" })),
  },
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
