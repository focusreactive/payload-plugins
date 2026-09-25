import { editorialInOwnMarkets, rejectMarketsOutsideEditorScope } from "@/lib/access/marketScoped";
import type { CollectionConfig, SelectField } from "payload";

import { editorial } from "@/lib/access";
import {
  deletePersonEmbedding,
  indexPersonEmbedding,
} from "@/collections/Person/hooks/indexEmbedding";
import {
  keepFeeEarnerEditsInDraft,
  trackReviewStatus,
} from "@/collections/Person/hooks/reviewWorkflow";
import { notFeeEarner, ownProfile } from "@/lib/access/feeEarner";
import { getPersonHref } from "@/dal";
import { MARKET_OPTIONS, marketsField } from "@/lib/fields/marketsField";
import { seoMetaGroup } from "@/lib/fields/seoMetaGroup";
import { redirectOnPersonSlugChange } from "@/lib/hooks/redirectOnSlugChange";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";

const editorsOnly = { update: notFeeEarner };

export const Person: CollectionConfig<"person"> = {
  access: {
    create: editorial,
    delete: editorialInOwnMarkets,
    // A never-published profile, or a fee-earner's pending edit, must not be readable by the public
    // API; the site itself reads published profiles only.
    read: ({ req: { user } }) => (user ? true : { _status: { equals: "published" } }),
    update: (args) => {
      const editorAccess = editorialInOwnMarkets(args);
      return editorAccess === false ? ownProfile(args) : editorAccess;
    },
  },
  admin: {
    components: {
      edit: {
        PublishButton: "@/components/admin/PersonReview/ReviewButtons#PublishOrSubmitForReview",
        UnpublishButton: "@/components/admin/PersonReview/ReviewButtons#UnpublishForEditorsOnly",
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["photo", "name", "jobTitle", "office", "reviewStatus", "updatedAt"],
    group: "Content",
    livePreview: {
      url: async ({ data, locale }) =>
        generatePreviewPath({
          collection: "person",
          path:
            (await getPersonHref({ name: data?.name }, locale.code ?? locale.fallbackLocale)) ?? "",
          slug: data?.name,
        }),
    },
    pagination: {
      limits: [20, 50, 100],
    },
    preview: async (data, { locale }) =>
      generatePreviewPath({
        collection: "person",
        path: (await getPersonHref({ name: data?.name as string }, locale)) ?? "",
        slug: data?.name as string,
      }),
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: {
          en: "This person's public web address is generated from their name. Changing it redirects the old address here automatically.",
          es: "La dirección web pública de esta persona se genera a partir de su nombre. Cambiarlo redirige automáticamente la dirección antigua a esta.",
          fr: "L'adresse web publique de cette personne est générée à partir de son nom. Si vous le modifiez, l'ancienne adresse redirige automatiquement vers la nouvelle.",
          ja: "この人物の公開ウェブアドレスは名前から生成されます。名前を変更すると、以前のアドレスは自動的に新しいアドレスへリダイレクトされます。",
        },
      },
      label: {
        en: "Name",
        es: "Nombre",
      },
      name: "name",
      access: editorsOnly,
      required: true,
      type: "text",
    },
    {
      label: {
        en: "Job Title",
        es: "Cargo",
      },
      name: "jobTitle",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "Used to match this person to an article's author automatically.",
          es: "Se usa para relacionar automáticamente a esta persona con el autor de un artículo.",
        },
      },
      label: {
        en: "Email",
        es: "Correo electrónico",
      },
      name: "email",
      access: editorsOnly,
      required: true,
      type: "email",
      unique: true,
    },
    {
      label: {
        en: "Office",
        es: "Oficina",
      },
      name: "office",
      access: editorsOnly,
      type: "text",
    },
    {
      label: {
        en: "Photo",
        es: "Foto",
      },
      name: "photo",
      relationTo: "media",
      type: "upload",
    },
    {
      label: {
        en: "Biography",
        es: "Biografía",
      },
      name: "biography",
      type: "textarea",
    },
    {
      name: "standfirst",
      type: "textarea",
      localized: true,
      label: { en: "Standfirst", es: "Entradilla" },
      admin: {
        description: {
          en: "One or two sentences shown under the name wherever this person is listed. Used when no contextual standfirst below fits the page.",
          es: "Una o dos frases bajo el nombre allí donde aparece esta persona.",
        },
      },
    },
    { ...(marketsField() as SelectField), access: editorsOnly },
    {
      name: "services",
      type: "relationship",
      relationTo: "page",
      hasMany: true,
      access: editorsOnly,
      label: { en: "Services", es: "Servicios" },
      admin: {
        description: {
          en: "The service pages this person works in. Lists them on those pages, and tells search engines what they know about.",
          es: "Las páginas de servicio en las que trabaja esta persona.",
        },
      },
    },
    {
      name: "contextualStandfirsts",
      type: "array",
      access: editorsOnly,
      label: { en: "Contextual standfirsts", es: "Entradillas por contexto" },
      labels: {
        singular: { en: "Contextual standfirst", es: "Entradilla por contexto" },
        plural: { en: "Contextual standfirsts", es: "Entradillas por contexto" },
      },
      admin: {
        description: {
          en: "A different standfirst for a listing on one service page, one market page, or both. The most specific match wins; anywhere else shows the standfirst above.",
          es: "Otra entradilla para un listado en una página de servicio o de mercado.",
        },
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "service",
              type: "relationship",
              relationTo: "page",
              label: { en: "On this service", es: "En este servicio" },
            },
            {
              name: "market",
              type: "select",
              options: [...MARKET_OPTIONS],
              label: { en: "In this market", es: "En este mercado" },
            },
          ],
        },
        {
          name: "text",
          type: "textarea",
          localized: true,
          required: true,
          label: { en: "Standfirst", es: "Entradilla" },
          validate: (
            value: string | null | undefined,
            { siblingData }: { siblingData: { service?: unknown; market?: unknown } }
          ) => {
            if (!siblingData.service && !siblingData.market) {
              return "Pick a service, a market, or both, so this standfirst knows where it belongs.";
            }
            return value ? true : "Write the standfirst.";
          },
        },
      ],
    },
    {
      name: "reviewStatus",
      type: "select",
      access: editorsOnly,
      label: { en: "Review status", es: "Estado de revisión" },
      options: [
        { label: { en: "Draft", es: "Borrador" }, value: "draft" },
        { label: { en: "Submitted for review", es: "Enviado a revisión" }, value: "submitted" },
        {
          label: { en: "Changes requested", es: "Cambios solicitados" },
          value: "changesRequested",
        },
      ],
      admin: {
        position: "sidebar",
        description: {
          en: "A fee-earner's changes wait here until an editor publishes them. To send them back, choose Changes requested, write a note and save a draft.",
          es: "Los cambios de un abogado esperan aquí hasta que un editor los publica.",
        },
      },
    },
    {
      name: "reviewerNote",
      type: "textarea",
      access: editorsOnly,
      label: { en: "Note from the reviewer", es: "Nota del revisor" },
      admin: {
        position: "sidebar",
        condition: (data) => Boolean(data?.reviewStatus),
      },
    },
    {
      ...seoMetaGroup({ descriptionFallback: "job title and office", titleFallback: "name" }),
      access: editorsOnly,
    },
  ],
  hooks: {
    afterChange: [indexPersonEmbedding, redirectOnPersonSlugChange],
    afterDelete: [deletePersonEmbedding],
    beforeChange: [rejectMarketsOutsideEditorScope, trackReviewStatus],
    beforeOperation: [keepFeeEarnerEditsInDraft],
  },
  labels: {
    plural: {
      en: "People",
      es: "Personas",
    },
    singular: {
      en: "Person",
      es: "Persona",
    },
  },
  slug: "person",
  versions: {
    // No autosave: every autosave from a fee-earner would count as a fresh submission.
    drafts: true,
    maxPerDoc: 25,
  },
};
