import type { CollectionConfig } from "payload";

import { ContentBlock } from "@/blocks/Content/config";
import { CtaBandBlock } from "@/blocks/CtaBand/config";
import { FaqBlock } from "@/blocks/Faq/config";
import { StatsBlock } from "@/blocks/Stats/config";
import { getSoleRelationId } from "@/dal/getSoleRelationId";
import { anyone, or, superAdmin, user } from "@/lib/access";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

import { batchGenerateEndpoint } from "./endpoints/batchGenerate";
import { generateNarrativeEndpoint } from "./endpoints/generateNarrative";
import {
  revalidateGeneratedPage,
  revalidateGeneratedPageDelete,
} from "./hooks/revalidateGeneratedPage";

function generatedPagePath(slug: string | undefined, locale: string | undefined): string {
  const path = `/online-doctor/${slug ?? ""}`;
  return locale && shouldIncludeLocalePrefix(locale) ? `/${locale}${path}` : path;
}

/**
 * A condition x city page. Everything except the narrative renders from the
 * two referenced entities; the narrative is the only AI-written part, and it
 * always lands in front of an editor before publish (drafts are the review
 * step). extraSections is the per-page override: hand-built blocks layered on
 * top of the generated base survive regeneration.
 *
 * Labels are plain strings on purpose: object labels render as
 * "[object Object]" in list-view sort buttons and create tooltips.
 */
export const GeneratedPages: CollectionConfig = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    group: "Programmatic Content",
    livePreview: {
      url: ({ data, locale: localeProp }) => {
        const fallback = localeProp.fallbackLocale;
        const locale = localeProp.code ?? (Array.isArray(fallback) ? fallback[0] : fallback);
        return generatePreviewPath({
          collection: "generated-pages",
          path: generatedPagePath(data?.slug, locale),
          slug: data?.slug ?? "",
        });
      },
    },
    preview: (data, { locale }) =>
      generatePreviewPath({
        collection: "generated-pages",
        path: generatedPagePath(data?.slug as string | undefined, locale),
        slug: (data?.slug as string) ?? "",
      }),
    useAsTitle: "title",
  },
  endpoints: [generateNarrativeEndpoint, batchGenerateEndpoint],
  fields: [
    {
      label: "Title",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        description:
          "The AI-written traveller story - the only generated part of the page. Everything else assembles from the condition and city entities.",
        rows: 14,
      },
      label: "Narrative",
      localized: true,
      name: "narrative",
      type: "textarea",
    },
    {
      admin: {
        description:
          "Per-page override: sections added here by hand are layered on top of the generated base and survive regeneration.",
        initCollapsed: true,
      },
      blocks: [FaqBlock, ContentBlock, StatsBlock, CtaBandBlock],
      label: "Extra sections (override)",
      localized: true,
      name: "extraSections",
      type: "blocks",
    },
    {
      admin: {
        description: "The header to display on the page",
        position: "sidebar",
      },
      defaultValue: async () => getSoleRelationId("header"),
      name: "header",
      relationTo: "header",
      type: "relationship",
    },
    {
      admin: {
        description: "The footer to display on the page",
        position: "sidebar",
      },
      defaultValue: async () => getSoleRelationId("footer"),
      name: "footer",
      relationTo: "footer",
      type: "relationship",
    },
    {
      admin: { position: "sidebar" },
      label: "Condition",
      name: "condition",
      relationTo: "conditions",
      required: true,
      type: "relationship",
    },
    {
      admin: { position: "sidebar" },
      label: "City",
      name: "city",
      relationTo: "cities",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        components: {
          Field: "/components/admin/GenerateNarrativeActions#GenerateNarrativeActions",
        },
        position: "sidebar",
      },
      name: "generateActions",
      type: "ui",
    },
    {
      admin: {
        description:
          "Assembled from the condition and city slugs by Generate. Localized: each locale carries its own URL segment, so a translated page gets a translated address rather than the English one under a language prefix.",
        position: "sidebar",
      },
      index: true,
      label: "Slug",
      localized: true,
      name: "slug",
      required: true,
      type: "text",
      unique: true,
    },
    {
      admin: {
        // Main body, not sidebar: a group positioned in the sidebar renders its
        // heading with an empty field list (Payload 3.84).
        description: "Provenance: who wrote what, with which model, from which inputs.",
      },
      fields: [
        {
          admin: { readOnly: true },
          label: "Generated at",
          name: "generatedAt",
          type: "date",
        },
        {
          admin: { readOnly: true },
          label: "Model",
          name: "generationModel",
          type: "text",
        },
        {
          admin: { readOnly: true },
          label: "Inputs",
          name: "generationInputs",
          type: "text",
        },
      ],
      label: "Generation provenance",
      name: "provenance",
      type: "group",
    },
  ],
  hooks: {
    afterChange: [revalidateGeneratedPage],
    afterDelete: [revalidateGeneratedPageDelete],
  },
  labels: {
    plural: "Generated Pages",
    singular: "Generated Page",
  },
  slug: "generated-pages",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
