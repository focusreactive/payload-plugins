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
  documentLevel,
  collectionLevel,
  fieldLevel,
} from "@focus-reactive/payload-plugin-translator";
import { analyticsPlugin } from "@focus-reactive/payload-plugin-analytics";
import { seoPlugin } from "@focus-reactive/payload-plugin-seo";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Articles } from "./collections/Articles";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Playground } from "./collections/Playground";
import { Users } from "./collections/Users";
import { Header } from "./globals/Header";
import { abAdapter } from "./lib/ab-testing/dbAdapter";
import { resolveDbAdapter } from "./lib/database/resolveAdapter";

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
  collections: [Users, Media, Pages, Articles, Playground],
  db: resolveDbAdapter(),
  jobs: {
    deleteJobOnComplete: false,
  },
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
      collections: [Pages, Articles, Playground],
      runner: createPayloadJobsRunner(),
      translationProvider: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY ?? "",
        dryRun: !process.env.OPENAI_API_KEY,
      }),
      levels: [documentLevel(), collectionLevel(), fieldLevel()],
      provenance: true,
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
        types: [
          "phone_click",
          "email_click",
          "directions_click",
          "whatsapp_click",
          "telegram_click",
          "website_click",
          "booking_click",
          "form_submit",
          "cta_pricing_click",
          "hero_cta_click",
        ],
        adminRegistry: "@/lead-actions-admin#default",
      },
      ab: {
        variantFields: { name: "title" },
      },
      pages: {
        collections: ["pages"],
        syntheticRefs: ["__home"],
        resolvePagePath: async (ref, req) => {
          if (ref === "__home") return "/";

          const [collection, id] = ref.split(":");
          if (collection !== "pages" || !id) return "";

          const doc = await req.payload
            .findByID({ collection: "pages", id, depth: 0, overrideAccess: true })
            .catch(() => null);
          const slug = (doc as { slug?: string } | null)?.slug;

          return slug ? `/${slug}` : "";
        },
      },
      mocks: true,
    }),
    seoPlugin({
      collections: [
        {
          slug: "pages",
          fields: {
            seoTitle: "seoTitle",
            metaDescription: "metaDescription",
            slug: "slug",
            content: "sections",
          },
        },
      ],
      site: {
        name: "Dev Site",
        baseUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
      },
      supportedLocales: ["en", "de", "fr", "es"],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
  sharp,
  typescript: {
    outputFile: path.resolve(baseDir, "payload-types.ts"),
  },
});
