import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { anyone, or, user, author, superAdmin } from "@/lib/access";

export const Authors: CollectionConfig<"authors"> = {
  access: {
    create: or(superAdmin, user, author),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
    // Author pages (/blog/author/<slug>) are public.
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["name", "slug", "updatedAt"],
    group: "Blog",
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: "The name of the author",
      },
      label: "Name",
      name: "name",
      required: true,
      type: "text",
    },
    {
      label: "Avatar",
      name: "avatar",
      relationTo: "media",
      type: "upload",
    },
    {
      admin: {
        description: "One or two sentences shown on the author page",
      },
      label: "Bio",
      localized: true,
      name: "bio",
      type: "textarea",
    },
    // Not NOT NULL in the database: existing authors (e.g. on a preview branch of production data)
    // get their slug generated from the name on the next save.
    slugField({ required: false, useAsSlug: "name" }),
  ],
  labels: {
    plural: "Authors",
    singular: "Author",
  },
  slug: "authors",
};
