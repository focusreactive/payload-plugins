import { VISUAL_SECTIONS_GROUP } from "@/lib/config/adminGroups";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";
import { seoPlugin as seoAnalysisPlugin } from "@focus-reactive/payload-plugin-seo";
import { visualEditingPlugin } from "@focus-reactive/payload-plugin-visual-editing";
import { nestedDocsPlugin } from "@payloadcms/plugin-nested-docs";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import type { Field, Plugin } from "payload";

import serverExtractPageContent from "@/collections/Page/serverExtractPageContent";
import serverExtractPostContent from "@/collections/Posts/serverExtractPostContent";
import { resolveDocUrl } from "@/lib/contentExtraction/links";
import { getMediaStoragePrefix } from "@/lib/storage/mediaStoragePrefix";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { superAdmin, or, authenticated, user } from "@/lib/access";
import { roleScopePlugin } from "@/lib/plugins/roleScope";
import { getServerSideURL } from "@/lib/utils/getURL";
import { validateRedirectPath } from "@/lib/utils/redirectUrl";
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
    label: {
      en: "Block",
      es: "Bloque",
    },
  };
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
        resolveUrl: resolveDocUrl("page"),
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
        resolveUrl: resolveDocUrl("posts"),
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

  // stackedEditing stays off on this branch until the other plugin upgrades are verified here.

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
        defaultColumns: ["name", "preview", "presetBlock", "updatedAt"],
        group: VISUAL_SECTIONS_GROUP,
      },
      fields: (defaultFields: Field[]) => defaultFields.map(withBlockNameCell),
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
      { slug: "globalBlock", titleField: "title" },
      { slug: "states", titleField: "name" },
      { slug: "clinics", titleField: "name" },
      { slug: "doctors", titleField: "name" },
      { slug: "treatments", titleField: "title" },
      { slug: "conditions", titleField: "title" },
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
    collections: ["page", "posts", "globalBlock"],
    globals: ["site-settings"],
    schedulePublish: {
      timeIntervals: 60,
    },
    secret: process.env.CRON_SECRET!,
  }),

  visualEditingPlugin({
    adminBasePath: "/admin",
    enrichment: "explicit",
    instantPreview: true,
    // Values the site puts into an href, a src or a tel: link, where a marker would break them.
    excludeFieldNames: ["path", "url", "videoUrl", "mapUrl", "phone", "profiles", "npi", "anchor"],
    skipCollections: [
      "users",
      "media",
      "categories",
      "authors",
      "testimonials",
      // The site header and footer render through the site chrome, which has no standalone preview here.
      "header",
      "footer",
      "document-embeddings",
      "redirects",
      "presets",
      "comments",
      "comment-reads",
      "payload-mcp-api-keys",
      "seo-keyphrases",
    ],
    skipGlobals: ["site-settings"],
  }),

  mcpPluginConfig,

  // Orders itself after every plugin that adds collections, so the blog editor is kept out of those too.
  roleScopePlugin({
    collections: ["posts", "categories", "authors", "media", "users", "comments", "comment-reads"],
    hiddenCollections: ["users"],
    role: "author",
  }),

  // Must stay last so it also protects collections and globals added by the plugins above.
  restrictApiAccess({
    collectionsWithPublicFiles: ["media"],
    globalsWithPublicRead: [],
  }),
];
