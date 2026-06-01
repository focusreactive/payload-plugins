import path from "node:path";
import { fileURLToPath } from "node:url";

import { openai } from "@ai-sdk/openai";
import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { aiPageBuilderPlugin } from "@focus-reactive/payload-plugin-ai-page-builder";
import type { AiBlockDefinition } from "@focus-reactive/payload-plugin-ai-page-builder";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import { translatorPlugin, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { z } from "zod";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Users } from "./collections/Users";
import { Header } from "./globals/Header";
import { abAdapter } from "./lib/ab-testing/dbAdapter";

const baseDir = path.dirname(fileURLToPath(import.meta.url));

const pageBlocks: AiBlockDefinition[] = [
  {
    slug: "hero",
    description: "above-the-fold section with headline and optional subtitle",
    schema: z.object({
      title: z.string().describe("The main headline"),
      description: z.string().optional().describe("Optional supporting subtitle"),
    }),
  },
  {
    slug: "copy",
    description: "body text section",
    schema: z.object({
      text: z.string().describe("The body copy"),
    }),
  },
];

export default buildConfig({
  admin: {
    importMap: {
      baseDir,
    },
    livePreview: {
      breakpoints: [
        { height: 667, label: "Mobile", name: "mobile", width: 375 },
        { height: 900, label: "Desktop", name: "desktop", width: 1280 },
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
      collections: {
        pages: {
          generatePath: ({ doc }) => {
            const slug = doc.slug as string | undefined;
            if (!slug) {
              return null;
            }
            return `/${slug}`;
          },
        },
      },
      storage: abAdapter,
    }),
    presetsPlugin(),
    schedulePublicationPlugin({
      collections: ["pages", "users"],
      secret: "secret",
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
      runner: createPayloadJobsRunner(),
      translationProvider: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY ?? "",
        dryRun: !process.env.OPENAI_API_KEY,
      }),
    }),
    ...(process.env.OPENAI_API_KEY
      ? [
          aiPageBuilderPlugin({
            model: openai("gpt-4o-mini"),
            collections: [{ slug: "pages" }],
            blocks: pageBlocks,
          }),
        ]
      : []),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
