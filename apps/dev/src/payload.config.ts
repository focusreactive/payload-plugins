import path from "node:path";
import { fileURLToPath } from "node:url";

import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import {
  translatorPlugin,
  createOpenAIProvider,
  createPayloadJobsRunner,
} from "@focus-reactive/payload-plugin-translator";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Users } from "./collections/Users";
import { Header } from "./globals/Header";
import { abAdapter } from "./lib/ab-testing/dbAdapter";

const filename = import.meta.filename;
const dirname = import.meta.dirname;

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        { label: "Mobile", name: "mobile", width: 375, height: 667 },
        { label: "Desktop", name: "desktop", width: 1280, height: 900 },
      ],
    },
    user: Users.slug,
  },
  collections: [Users, Media, Pages],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || "",
    },
  }),
  editor: lexicalEditor(),
  globals: [Header],
  localization: {
    defaultLocale: "en",
    fallback: true,
    locales: [
      { code: "en", label: "English" },
      { code: "de", label: "Deutsch" },
      { code: "fr", label: "Français" },
      { code: "es", label: "Español" },
    ],
  },
  plugins: [
    abTestingPlugin({
      storage: abAdapter,
      collections: {
        pages: {
          generatePath: ({ doc }) => {
            const slug = doc.slug as string | undefined;
            if (!slug) return null;
            return `/${slug}`;
          },
        },
      },
    }),
    presetsPlugin(),
    schedulePublicationPlugin({
      secret: "secret",
      collections: ["pages", "users"],
    }),
    commentsPlugin({
      collections: [
        {
          slug: "pages",
          titleField: "title",
        },
      ],
      usernameFieldPath: "name",
    }),
    translatorPlugin({
      collections: [Pages],
      translationProvider: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY ?? "",
        dryRun: !process.env.OPENAI_API_KEY,
      }),
      runner: createPayloadJobsRunner(),
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
