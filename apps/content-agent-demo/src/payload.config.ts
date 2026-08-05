import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { contentAgentPlugin } from "payload-content-agent";

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
  plugins: [
    mcpPlugin({
      collections: {
        authors: {
          description: "Blog authors. Each author has a name, a localized bio and an avatar image.",
          enabled: { create: true, delete: true, find: true, update: true },
        },
        categories: {
          description: "Blog categories with a localized title and a URL slug. Localized en/es.",
          enabled: { create: true, delete: true, find: true, update: true },
        },
        media: {
          description: "Uploaded images with localized alt text.",
          enabled: { create: true, delete: true, find: true, update: true },
        },
        pages: {
          description:
            "Block-based pages. The `blocks` field composes Hero, Content, FAQ and CTA sections. Drafts + versions, localized en/es.",
          enabled: { create: true, delete: true, find: true, update: true },
        },
        posts: {
          description:
            "Blog posts with a lexical rich-text body, excerpt, hero image, authors and categories. Drafts + versions, localized en/es.",
          enabled: { create: true, delete: true, find: true, update: true },
        },
      },
      globals: {
        "site-settings": {
          description: "Site name and primary navigation. Localized en/es.",
          enabled: { find: true, update: true },
        },
      },
    }),
    contentAgentPlugin({
      mcpApiKey: process.env.MCP_API_KEY ?? "",
      memoryDatabaseUrl: process.env.DATABASE_URL,
      provider: "openai",
      schemaPromptMode: "auto",
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
