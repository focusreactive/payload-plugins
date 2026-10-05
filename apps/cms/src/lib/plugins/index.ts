import { analyticsPlugin } from "@focus-reactive/payload-plugin-analytics";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import { seoPlugin as seoAnalysisPlugin } from "@focus-reactive/payload-plugin-seo";
import {
  translatorPlugin,
  createOpenAIProvider,
  createSyncRunner,
} from "@focus-reactive/payload-plugin-translator";
import { visualEditingPlugin } from "@fr-private/payload-plugin-visual-editing";
import { nestedDocsPlugin } from "@payloadcms/plugin-nested-docs";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import type { Field, PayloadRequest, Plugin } from "payload";

import { Authors } from "@/collections/Authors";
import { Categories } from "@/collections/Categories";
import { Footer } from "@/collections/Footer/config";
import { Header } from "@/collections/Header/config";
import { Page as PageCollection } from "@/collections/Page/Page";
import serverExtractPageContent from "@/collections/Page/serverExtractPageContent";
import { Posts } from "@/collections/Posts";
import { Vacancies } from "@/collections/Vacancies";
import serverExtractPostContent from "@/collections/Posts/serverExtractPostContent";
import { CUSTOM_PAGES_CONFIG } from "@/lib/config/customPages";
import { getMediaStoragePrefix } from "@/lib/storage/mediaStoragePrefix";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { superAdmin, or, authenticated, user } from "@/lib/access";
import { getServerSideURL } from "@/lib/utils/getURL";
import { validateRedirectPath } from "@/lib/utils/redirectUrl";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { normalizeRedirectFields } from "@/lib/hooks/normalizeRedirectFields";
import { revalidateRedirects } from "@/lib/hooks/revalidateRedirects";
import type { Page } from "@/payload-types";

import { mcpPluginConfig } from "./mcp";
import { restrictApiAccess } from "./restrictApiAccess";

const withBlockNameCell = (field: Field): Field => {
  if (field.type !== "blocks" || field.name !== "presetBlock") return field;

  return {
    ...field,
    admin: {
      ...field.admin,
      components: {
        ...field.admin?.components,
        Cell: "/components/admin/BlockNameCell#BlockNameCell",
      },
    },
    label: "Block",
  };
};

const resolveAnalyticsPagePath = async (ref: string, req: PayloadRequest): Promise<string> => {
  const { defaultLocale } = I18N_CONFIG;

  if (ref === "__home") return "/";
  if (ref === "__blog-index") return CUSTOM_PAGES_CONFIG.blog.resolver(defaultLocale);
  if (ref === "__search") return CUSTOM_PAGES_CONFIG.search.resolver(defaultLocale);

  const idx = ref.indexOf(":");
  if (idx <= 0) return "";

  const collection = ref.slice(0, idx);
  const id = ref.slice(idx + 1);

  if (collection === "page") {
    const doc = await req.payload
      .findByID({
        collection: "page",
        id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);

    return (
      buildUrl({
        collection: "page",
        breadcrumbs: doc?.breadcrumbs,
        absolute: false,
        locale: defaultLocale,
      }) || "/"
    );
  }

  if (collection === "posts") {
    const doc = await req.payload
      .findByID({
        collection: "posts",
        id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);

    return buildUrl({
      collection: "posts",
      slug: doc?.slug,
      absolute: false,
      locale: defaultLocale,
    });
  }

  return "";
};

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const plugins: Plugin[] = [
  vercelBlobStorage({
    alwaysInsertFields: true,
    cacheControlMaxAge: ONE_YEAR_IN_SECONDS,
    clientUploads: true,
    collections: {
      // Direct Blob URLs. Media `read` is public (`anyone`); do not enable this if read is restricted.
      media: { disablePayloadAccessControl: true, prefix: getMediaStoragePrefix() },
    },
    // Off without a token (Docker / self-hosted) or when MEDIA_STORAGE=local forces `public/media`.
    enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN) && process.env.MEDIA_STORAGE !== "local",
    token: process.env.BLOB_READ_WRITE_TOKEN || "",
  }),
  redirectsPlugin({
    collections: ["page", "posts"],
    overrides: {
      admin: { group: "Settings" },
      // @ts-expect-error — `.map()` over the `Field` union returns spread object literals that TS
      // will not re-narrow to `Field`, so the callback's return type is not assignable to
      // `FieldsOverride`'s `Field[]`.
      fields: ({ defaultFields }) => {
        const customFields: Field[] = [
          {
            admin: {
              description: "Whether the redirect is active.",
            },
            defaultValue: true,
            label: "Active",
            localized: true,
            name: "isActive",
            required: true,
            type: "checkbox",
          },
        ];

        return defaultFields.concat(customFields).map((field) => {
          if ("name" in field && field.name === "from") {
            return {
              ...field,
              admin: {
                description:
                  "Latin letters, numbers, / - _ . ~ only. No spaces. Stored as lowercase with leading slash.",
              },
              unique: false,
              validate: validateRedirectPath,
            };
          }

          if ("type" in field && field.type === "select") {
            return {
              ...field,
              localized: true,
            };
          }

          if (
            "name" in field &&
            field.name === "to" &&
            "fields" in field &&
            Array.isArray(field.fields)
          ) {
            return {
              ...field,
              fields: field.fields.map((sub: Field) =>
                "name" in sub && sub.name === "url"
                  ? {
                      ...sub,
                      localized: true,
                      validate: (v: unknown) =>
                        validateRedirectPath(v as string, { allowUrl: true }),
                    }
                  : {
                      ...sub,
                      localized: true,
                    }
              ),
              localized: true,
            };
          }
          return field;
        });
      },
      hooks: {
        afterChange: [revalidateRedirects],
        beforeChange: [normalizeRedirectFields],
      },
      access: {
        create: or(superAdmin, user),
        delete: or(superAdmin, user),
        read: or(superAdmin, user),
        update: or(superAdmin, user),
      },
    },
    redirectTypeFieldOverride: {
      admin: {
        description: "Choose the redirect type. 307 - temporary, 308 - permanent.",
      },
      defaultValue: "307",
      label: "Redirect type",
      required: true,
    },
    redirectTypes: ["307", "308"],
  }),
  seoAnalysisPlugin({
    collections: [
      {
        slug: "page",
        fields: {
          seoTitle: "meta.title",
          metaDescription: "meta.description",
          slug: "slug",
        },
        extractContentPath: "@/collections/Page/extractPageContent#default",
        serverExtractContent: serverExtractPageContent,
      },
      {
        slug: "posts",
        fields: {
          seoTitle: "meta.title",
          metaDescription: "meta.description",
          slug: "slug",
        },
        extractContentPath: "@/collections/Posts/extractPostContent#default",
        serverExtractContent: serverExtractPostContent,
      },
    ],
    site: {
      baseUrl: getServerSideURL(),
      faviconUrl: "/favicon.ico",
    },
    supportedLocales: I18N_CONFIG.locales.map((locale) => locale.code),
  }),

  nestedDocsPlugin({
    collections: ["page"],
    generateLabel: (_, doc: unknown) => (doc as Page).title,
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ""),
  }),

  presetsPlugin({
    labels: {
      plural: "Presets",
      singular: "Preset",
    },
    overrides: {
      access: {
        create: or(superAdmin, user),
        delete: or(superAdmin, user),
        read: authenticated,
        update: or(superAdmin, user),
      },
      admin: {
        defaultColumns: ["name", "preview", "presetBlock", "updatedAt"],
        group: "Settings",
      },
      fields: (defaultFields: Field[]) => defaultFields.map(withBlockNameCell),
    },
    packageName: "@focus-reactive/payload-plugin-presets",
  }),

  commentsPlugin({
    collections: [
      { slug: "page", titleField: "title" },
      { slug: "posts", titleField: "title" },
      { slug: "vacancies", titleField: "title" },
      { slug: "categories", titleField: "title" },
      { slug: "authors", titleField: "name" },
      { slug: "header", titleField: "name" },
      { slug: "footer", titleField: "name" },
    ],

    usernameFieldPath: "name",
  }),

  schedulePublicationPlugin({
    collections: ["page", "posts", "vacancies"],
    globals: ["site-settings"],
    schedulePublish: {
      timeIntervals: 60,
    },
    secret: process.env.CRON_SECRET!,
  }),

  translatorPlugin({
    collections: [PageCollection, Posts, Vacancies, Categories, Authors, Header, Footer].map(
      (col) => JSON.parse(JSON.stringify(col, (_, v) => (typeof v === "function" ? undefined : v)))
    ),
    access: { check: ({ req }) => Boolean(req.user) },
    runner: createSyncRunner(),
    translationProvider: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      dryRun: false,
      model: "gpt-4o-mini",
      systemPrompt: ({ defaultPrompt }) =>
        `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
    }),
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
      types: ["cta_click", "newsletter_signup"],
    },
    pages: {
      collections: ["page", "posts"],
      syntheticRefs: ["__home", "__blog-index", "__search"],
      resolvePagePath: resolveAnalyticsPagePath,
    },
  }),

  visualEditingPlugin({
    adminBasePath: "/admin",
    skipCollections: [
      "users",
      "media",
      "categories",
      "authors",
      "header",
      "footer",
      "redirects",
      "presets",
      "comments",
      "comment-reads",
      "payload-mcp-api-keys",
    ],
    skipGlobals: ["site-settings"],
  }),

  mcpPluginConfig,

  // Must stay last so it also protects collections and globals added by the plugins above.
  restrictApiAccess({
    collectionsWithPublicFiles: ["media"],
  }),
];
