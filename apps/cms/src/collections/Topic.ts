/**
 * Topics are a collection, not a string array on Talk, for one reason that matters on a content
 * archive: a topic needs its own indexable URL. The topic listings this replaces emit no
 * structured data at all, and a topic page is the natural landing page for the search and answer
 * engine traffic such an archive should be earning.
 *
 * A curated vocabulary tends to pair its terms - "Doubt / Certainty" - so `title` carries the
 * slash, and a legacy catalogue export tends to escape it as "Doubt \/ Certainty". Unescape on
 * the way in; the seed script does.
 */

import type { CollectionConfig } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { slugField } from "payload";
import { generateSeoFields } from "@/lib/utils/seoFields";

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
    { label: "Title", localized: true, name: "title", required: true, type: "text" },
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
            { label: "Description", localized: true, name: "description", type: "textarea" },
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
  labels: { plural: "Topics", singular: "Topic" },
  slug: "topic",
  timestamps: true,
};
