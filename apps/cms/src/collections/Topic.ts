/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/collections/Topic.ts
 *
 * Topics are a collection, not a string array on Talk, for one reason that matters to this deal:
 * a topic needs its own indexable URL. Their 335 `/browse-topics/*` pages currently emit no
 * structured data at all, and a topic page is the natural landing page for the search and answer
 * engine traffic the whole engagement is about.
 *
 * Their live topic vocabulary is real and already curated - "Fear / Fearlessness",
 * "Addiction / Codependency" - so `title` carries the slash. Note the catalogue export escapes
 * these as "Fear \/ Fearlessness"; seed-payload.mjs unescapes before writing.
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
    slugField({ required: true, useAsSlug: "title" }),
    { label: "Description", localized: true, name: "description", type: "textarea" },
    {
      // generateSeoFields() MUST be nested in a named tab, not spread at the collection root.
      // It emits its own `title` and `description`, so spreading it next to the collection's own
      // `title` throws DuplicateFieldName at config build - a runtime failure that typechecks
      // clean, so it is only ever found by starting Payload. `name: "meta"` also matches how the
      // renderer reads it (talk.meta?.title) and how Posts and Page both do it.
      type: "tabs",
      tabs: [
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
