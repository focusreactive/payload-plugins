import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";

import { preventDeleteIfReferenced } from "./hooks/preventDeleteIfReferenced";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";

export const GlobalBlock: CollectionConfig<"globalBlock"> = {
  access: {
    create: or(superAdmin, user, author),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "block", "updatedAt"],
    group: "Global Components",
    useAsTitle: "title",
  },
  dbName: "gsec",
  fields: [
    {
      admin: {
        description: "Internal name to identify this global block in the picker.",
      },
      defaultValue: createLocalizedDefault({ en: "Global Block" }),
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        components: {
          Cell: "/components/admin/BlockNameCell#BlockNameCell",
        },
        description: "The single block this global represents. Edit once, reuse on any page.",
        initCollapsed: true,
      },
      blocks: contentBlocks,
      localized: true,
      maxRows: 1,
      minRows: 1,
      name: "block",
      required: true,
      type: "blocks",
    },
  ],
  hooks: {
    beforeChange: [denyPublishForAuthors],
    beforeDelete: [preventDeleteIfReferenced],
  },
  labels: {
    plural: "Global Blocks",
    singular: "Global Block",
  },
  slug: "globalBlock",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
