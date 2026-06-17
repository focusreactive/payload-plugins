import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { analyticsPlugin } from "@focus-reactive/payload-plugin-analytics";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import { translatorPlugin, createOpenAIProvider, createSyncRunner } from "@focus-reactive/payload-plugin-translator";
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
import { Posts } from "@/collections/Posts";
import { Testimonials } from "@/collections/Testimonials";
import { CUSTOM_PAGES_CONFIG } from "@/core/config/customPages";
import { I18N_CONFIG } from "@/core/config/i18n";
import { abAdapter } from "@/core/lib/abTesting/abAdapter";
import { buildVariantData } from "@/core/lib/abTesting/buildVariantData";
import type { ABVariantData } from "@/core/lib/abTesting/types";
import { superAdmin, or, authenticated, user } from "@/core/lib/access";
import { shouldIncludeLocalePrefix } from "@/core/lib/localePrefix";
import { validateRedirectPath } from "@/core/lib/redirectUrl";
import { isDev } from "@/core/utils/isDev";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { normalizeRedirectFields } from "@/hooks/normalizeRedirectFields";
import { revalidateRedirects } from "@/hooks/revalidateRedirects";
import type { Page } from "@/payload-types";

import { mcpPluginConfig } from "./mcp";
import seoPlugin from "./seoPlugin";

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

export const plugins: Plugin[] = [
  vercelBlobStorage({
    collections: {
      media: true,
    },
    enabled: process.env.NODE_ENV === "production",
    token: process.env.BLOB_READ_WRITE_TOKEN || "",
  }),
  redirectsPlugin({
    collections: ["page", "posts"],
    overrides: {
      admin: { group: "Settings" },
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        const customFields: Field[] = [
          {
            admin: {
              description: {
                en: "Whether the redirect is active.",
                es: "Si la redirección está activa.",
              },
            },
            defaultValue: true,
            label: {
              en: "Active",
              es: "Activo",
            },
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
                description: {
                  en: "Latin letters, numbers, / - _ . ~ only. No spaces. Stored as lowercase with leading slash.",
                  es: "Solo letras latinas, números, / - _ . ~. Sin espacios. Se guarda en minúsculas con barra inicial.",
                },
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

          if ("name" in field && field.name === "to" && "fields" in field && Array.isArray(field.fields)) {
            return {
              ...field,
              fields: field.fields.map((sub: Field) =>
                "name" in sub && sub.name === "url"
                  ? {
                      ...sub,
                      localized: true,
                      validate: (v: unknown) => validateRedirectPath(v as string, { allowUrl: true }),
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
        description: {
          en: "Choose the redirect type. 307 - temporary, 308 - permanent.",
          es: "Elige el tipo de redirección. 307 - temporal, 308 - permanente.",
        },
      },
      defaultValue: "307",
      label: {
        en: "Redirect type",
        es: "Tipo de redirección",
      },
      required: true,
    },
    redirectTypes: ["307", "308"],
  }),
  seoPlugin,

  nestedDocsPlugin({
    collections: ["page"],
    generateLabel: (_, doc: unknown) => (doc as Page).title,
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ""),
  }),

  presetsPlugin({
    labels: {
      plural: { en: "Presets", es: "Presets" },
      singular: { en: "Preset", es: "Preset" },
    },
    overrides: {
      access: {
        create: or(superAdmin, user),
        delete: or(superAdmin, user),
        read: authenticated,
        update: or(superAdmin, user),
      },
      admin: {
        defaultColumns: ["name", "preview", "type", "updatedAt"],
        group: "Settings",
      },
      fields: (defaultFields: Field[]) => defaultFields,
    },
    packageName: "@focus-reactive/payload-plugin-presets",
  }),

  commentsPlugin({
    collections: [
      { slug: "page", titleField: "title" },
      { slug: "posts", titleField: "title" },
      { slug: "categories", titleField: "title" },
      { slug: "authors", titleField: "name" },
      { slug: "testimonials", titleField: "author" },
      { slug: "header", titleField: "name" },
      { slug: "footer", titleField: "name" },
    ],

    translations: {
      es: {
        add: "Añadir comentario",
        cancel: "Cancelar",
        close: "Cerrar",
        comment: "Comentario",
        delete: "Eliminar",
        deletedUser: "Usuario eliminado",
        failedToAdd: "Error al añadir el comentario",
        failedToDelete: "Error al eliminar el comentario",
        failedToPost: "Error al publicar el comentario",
        failedToUpdate: "Error al actualizar el comentario",
        general: "General",
        label: "Comentarios",
        loadingComments: "Cargando comentarios...",
        noMentionMatches: "Sin coincidencias",
        openCommentsAria: "Abrir comentarios",
        openComments_one: "{{count}} comentario abierto",
        openComments_other: "{{count}} comentarios abiertos",
        posting: "Publicando…",
        reopen: "Reabrir",
        resolve: "Resolver",
        syncingComments: "Sincronizando comentarios",
        unknownAuthor: "Desconocido",
        writeComment: "Escribe un comentario",
      },
    },

    usernameFieldPath: "name",
  }),

  schedulePublicationPlugin({
    collections: ["page", "posts"],
    globals: ["site-settings"],
    schedulePublish: {
      timeIntervals: 60,
    },
    secret: process.env.CRON_SECRET!,
  }),

  translatorPlugin({
    collections: [PageCollection, Posts, Categories, Authors, Testimonials, Header, Footer].map((col) => JSON.parse(JSON.stringify(col, (_, v) => (typeof v === "function" ? undefined : v)))),
    runner: createSyncRunner(),
    translationProvider: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      dryRun: false,
      model: "gpt-4o-mini",
      systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
    }),
  }),

  abTestingPlugin<ABVariantData>({
    collections: {
      page: {
        generatePath: ({ doc: docProp, locale }) => {
          const doc = docProp as unknown as Page;

          const breadcrumbs = doc.breadcrumbs ?? [];
          const lastUrl = breadcrumbs.at(-1)?.url ?? "";
          const restPath = !lastUrl || lastUrl === "/home" ? "" : lastUrl;

          const resolvedLocale = locale ?? I18N_CONFIG.defaultLocale;
          return shouldIncludeLocalePrefix(resolvedLocale) ? `/${resolvedLocale}${restPath}` : restPath || "/";
        },
        generateVariantData: ({ variantDoc, locale }) => buildVariantData(variantDoc as unknown as Page & { _abPassPercentage?: number }, locale),
      },
    },
    debug: isDev(),
    storage: abAdapter,
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
    ab: {
      experimentsCollectionSlug: "ab-experiments",
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
      "testimonials",
      "header",
      "footer",
      "document-embeddings",
      "redirects",
      "presets",
      "comments",
      "comment-reads",
      "ab-experiments",
      "payload-mcp-api-keys",
    ],
    skipGlobals: ["site-settings"],
  }),

  mcpPluginConfig,
];
