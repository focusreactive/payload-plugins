import type { CollectionConfig } from "payload";
import { slugField } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { slugify } from "@/lib/utils/slugify";

export const Tags: CollectionConfig<"tags"> = {
  access: {
    create: or(superAdmin, user, author),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title"],
    group: "Blog",
    useAsTitle: "title",
  },
  fields: [
    {
      defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.tags.title),
      label: "Title",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    slugField({
      overrides: (field) => {
        const slugSub = field.fields?.[1] as { unique?: boolean } | undefined;
        if (slugSub && "unique" in slugSub) {
          slugSub.unique = false;
        }
        return field;
      },
      required: true,
      slugify,
      useAsSlug: "title",
    }),
  ],
  labels: {
    plural: "Tags",
    singular: "Tag",
  },
  slug: "tags",
};
