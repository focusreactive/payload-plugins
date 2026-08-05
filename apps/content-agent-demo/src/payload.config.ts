import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import { Users } from "./collections/Users";
import { DEFAULT_LOCALE, LOCALES } from "./lib/locales";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    importMap: { baseDir },
    user: Users.slug,
  },
  collections: [Users],
  db: postgresAdapter({
    migrationDir: path.resolve(baseDir, "migrations"),
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL ?? "",
    },
  }),
  editor: lexicalEditor(),
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
