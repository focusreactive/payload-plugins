import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import {
  translatorPlugin,
  createOpenAIProvider,
  createSyncRunner,
} from "@focus-reactive/payload-plugin-translator";
import { nestedDocsPlugin } from "@payloadcms/plugin-nested-docs";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import type { Field, Plugin } from "payload";

import { Authors } from "@/collections/Authors";
import { Categories } from "@/collections/Categories";
import { Footer } from "@/collections/Footer/config";
import { Header } from "@/collections/Header/config";
import { Page as PageCollection } from "@/collections/Page/Page";
import { Posts } from "@/collections/Posts";
import { Testimonials } from "@/collections/Testimonials";
import { I18N_CONFIG } from "@/core/config/i18n";
import { abAdapter } from "@/core/lib/abTesting/abAdapter";
import { buildVariantData } from "@/core/lib/abTesting/buildVariantData";
import type { ABVariantData } from "@/core/lib/abTesting/types";
import { superAdmin, or, authenticated, user } from "@/core/lib/access";
import { shouldIncludeLocalePrefix } from "@/core/lib/localePrefix";
import { validateRedirectPath } from "@/core/lib/redirectUrl";
import { isDev } from "@/core/utils/isDev";
import { normalizeRedirectFields } from "@/hooks/normalizeRedirectFields";
import { revalidateRedirects } from "@/hooks/revalidateRedirects";
import type { Page } from "@/payload-types";

import { mcpPluginConfig } from "./mcp";
import seoPlugin from "./seoPlugin";

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
            name: "isActive",
            type: "checkbox",
            required: true,
            defaultValue: true,
            localized: true,
            label: {
              en: "Active",
              es: "Activo",
            },
            admin: {
              description: {
                en: "Whether the redirect is active.",
                es: "Si la redirección está activa.",
              },
            },
          },
        ];

        return defaultFields.concat(customFields).map((field) => {
          if ("name" in field && field.name === "from") {
            return {
              ...field,
              unique: false,
              validate: validateRedirectPath,
              admin: {
                description: {
                  en: "Latin letters, numbers, / - _ . ~ only. No spaces. Stored as lowercase with leading slash.",
                  es: "Solo letras latinas, números, / - _ . ~. Sin espacios. Se guarda en minúsculas con barra inicial.",
                },
              },
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
              localized: true,
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
            };
          }
          return field;
        });
      },
      hooks: {
        beforeChange: [normalizeRedirectFields],
        afterChange: [revalidateRedirects],
      },
      access: {
        read: or(superAdmin, user),
        create: or(superAdmin, user),
        delete: or(superAdmin, user),
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
    generateLabel: (_, doc: unknown) => {
      return (doc as Page).title;
    },
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
    collections: [
      PageCollection,
      Posts,
      Categories,
      Authors,
      Testimonials,
      Header,
      Footer,
    ].map((col) =>
      JSON.parse(
        JSON.stringify(col, (_, v) => (typeof v === "function" ? undefined : v))
      )
    ),
    runner: createSyncRunner(),
    translationProvider: createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-4o-mini",
      systemPrompt: ({ defaultPrompt }) =>
        `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
      dryRun: false,
    }),
  }),

  abTestingPlugin<ABVariantData>({
    collections: {
      page: {
        generatePath: ({ doc: docProp, locale }) => {
          const doc = docProp as unknown as Page;

          const breadcrumbs = doc.breadcrumbs ?? [];
          const lastUrl = breadcrumbs[breadcrumbs.length - 1]?.url ?? "";
          const restPath = !lastUrl || lastUrl === "/home" ? "" : lastUrl;

          const resolvedLocale = locale ?? I18N_CONFIG.defaultLocale;
          return shouldIncludeLocalePrefix(resolvedLocale)
            ? `/${resolvedLocale}${restPath}`
            : restPath || "/";
        },
        generateVariantData: ({ variantDoc, locale }) => {
          return buildVariantData(
            variantDoc as unknown as Page & { _abPassPercentage?: number },
            locale
          );
        },
      },
    },
    debug: isDev(),
    storage: abAdapter,
  }),

  mcpPluginConfig,
];
