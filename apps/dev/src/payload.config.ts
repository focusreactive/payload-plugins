import path from "node:path";
import { fileURLToPath } from "node:url";

import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import { translatorPlugin, createOpenAIProvider, createPayloadJobsRunner, documentLevel, collectionLevel } from "@focus-reactive/payload-plugin-translator";
import { analyticsPlugin } from "@focus-reactive/payload-plugin-analytics";
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
      levels: [documentLevel(), collectionLevel()],
    }),
    analyticsPlugin({
      ga4: {
        measurementId: process.env.GA4_MEASUREMENT_ID!,
        propertyId: process.env.GA4_PROPERTY_ID!,
        serviceAccount: {
          clientEmail: process.env.GA4_CLIENT_EMAIL!,
          privateKey: (process.env.GA4_PRIVATE_KEY ?? "").replace(/\\n/gu, "\n"),
        },
      },
      leadActions: {
        types: ["phone_click", "email_click", "directions_click", "whatsapp_click", "telegram_click", "website_click", "booking_click", "form_submit", "cta_pricing_click"],
        adminRegistry: "@/lead-actions-admin#default",
      },
      ab: {
        variantFields: { name: "title" },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
