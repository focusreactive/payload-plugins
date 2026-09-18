/**
 * Topics are a collection, not a string array on Talk, for one reason that matters on a content
 * archive: a topic needs its own indexable URL. The topic listings this replaces emit no
 * structured data at all, and a topic page is the natural landing page for the search and answer
 * engine traffic such an archive should be earning.
 *
 * A curated vocabulary tends to pair its terms - "Doubt / Certainty" - so `title` carries the
 * slash, and a legacy catalogue export tends to escape it as "Doubt \/ Certainty". Unescape on
 * the way in; the seed script does.
 *
 * Field labels here are plain strings, not the { en, es } objects the rest of the repo uses on
 * collections. That is deliberate: Payload 3.84 renders an object label as "[object Object]" in
 * list-view sort buttons and create tooltips (see Talk.ts). Tabs are unaffected and keep the
 * localized form.
 */

import type { CollectionConfig } from "payload";

import { extractTopicText } from "@/lib/search/extractSearchText";
import { buildEmbeddingHooks } from "@/lib/search/indexHooks";
import type { Topic as TopicDoc } from "@/payload-types";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { slugField } from "payload";
import { generateSeoFields } from "@/lib/utils/seoFields";

/**
 * A topic is indexed as well as a talk because on this archive a topic page IS a destination: a
 * reader searching "resentment" wants the curated page of teachings about it at least as much as
 * one talk. `requirePublished` is off because Topic runs no drafts - it has no `_status` column at
 * all, so gating on one would index nothing.
 */
const topicEmbeddingHooks = buildEmbeddingHooks<TopicDoc>({
  collection: "topic",
  extractText: extractTopicText,
  requirePublished: false,
});

export const Topic: CollectionConfig<"topic"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "slug", "updatedAt"],
    group: "Content",
    useAsTitle: "title",
  },
  fields: [
    {
      admin: {
        description: {
          en: "What this subject is called. It becomes the heading of its own page and the label wherever this topic is listed.",
          es: "Cómo se llama este tema. Se convierte en el encabezado de su propia página y en la etiqueta en cualquier lugar donde se liste este tema.",
        },
      },
      label: "Title",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      // Two tabs, matching a Page document: the editor lands on Content and finds SEO beside it.
      // The Content tab is UNNAMED, which in Payload is presentational - every field inside it is
      // still stored at the top level of the document, so this is layout only, with no schema
      // delta and no migration.
      //
      // generateSeoFields() MUST stay nested in the NAMED tab. It emits its own `title` and
      // `description`, so spreading it next to the collection's own `title` throws
      // DuplicateFieldName at config build - a runtime failure that typechecks clean, so it is
      // only ever found by starting Payload. `name: "meta"` also matches how the renderer reads
      // it (topic.meta?.title) and how Posts and Page both do it.
      type: "tabs",
      tabs: [
        {
          fields: [
            slugField({ required: true, useAsSlug: "title" }),
            {
              admin: {
                description: {
                  en: "The introduction shown under the heading on this topic's own page. Also used as the search description when the SEO tab is left empty.",
                  es: "La introducción que se muestra bajo el encabezado en la página propia de este tema. También se usa como descripción de búsqueda cuando la pestaña de SEO se deja vacía.",
                },
              },
              label: "Description",
              localized: true,
              name: "description",
              type: "textarea",
            },
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: generateSeoFields({ generation: true }),
          label: { en: "SEO", es: "SEO" },
          localized: true,
          name: "meta",
        },
      ],
    },
  ],
  hooks: topicEmbeddingHooks,
  labels: { plural: "Topics", singular: "Topic" },
  slug: "topic",
  timestamps: true,
};
