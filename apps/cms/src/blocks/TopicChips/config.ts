/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/TopicChips/config.ts
 *
 * "Start where you are" - a row of topic links. Small block, but it carries the navigation
 * argument: their archive sits 94 to 224 clicks from the homepage on 12-per-page pagination with
 * no jump link, which is one of the two independent reasons Google cannot see it. Topic chips on
 * the homepage are the shortest possible fix for that, and they cost nothing to maintain.
 */

import type { Block } from "payload";

import { injectSection } from "@/lib/fields/section/injectSection";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

export const TopicChipsBlock: Block = injectSection({
  ...getBlockPreviewImage("Topic Chips"),
  fields: [
    ...sectionHeaderFields({
      headingDefault: { en: "Start where you are", es: "Empieza donde estás" },
    }),
    {
      admin: {
        description: {
          en: "Leave empty to show the topics carrying the most talks.",
          es: "Dejar vacío para mostrar los temas con más charlas.",
        },
        initCollapsed: true,
      },
      fields: [
        {
          label: { en: "Topic", es: "Tema" },
          name: "topic",
          relationTo: "topic",
          required: true,
          type: "relationship",
        },
      ],
      label: { en: "Topics", es: "Temas" },
      name: "topicItems",
      type: "array",
    },
  ],
  interfaceName: "TopicChipsBlock",
  labels: {
    plural: { en: "Topic Chips", es: "Etiquetas de tema" },
    singular: { en: "Topic Chips", es: "Etiquetas de tema" },
  },
  slug: "topicChips",
});
