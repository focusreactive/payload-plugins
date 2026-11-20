import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { ADMIN_GROUPS } from "@/lib/config/adminGroups";
import { createStandalonePreview } from "@/lib/utils/standalonePreview";

import { preventDeleteIfReferenced } from "./hooks/preventDeleteIfReferenced";
import { revalidatePagesUsingGlobalBlock } from "./hooks/revalidatePagesUsingGlobalBlock";

export const GlobalBlock: CollectionConfig<"globalBlock"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    components: {
      edit: createLivePreviewEditComponents(),
    },
    defaultColumns: ["title", "block", "_status", "updatedAt"],
    group: ADMIN_GROUPS.visualSections,
    ...createStandalonePreview("globalBlock"),
    useAsTitle: "title",
  },
  dbName: "gsec",
  fields: [
    {
      admin: {
        description: {
          en: "Internal name, shown only in the admin.",
          es: "Nombre interno, solo visible en el panel.",
        },
        position: "sidebar",
      },
      defaultValue: "Global section",
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: {
        components: {
          Cell: "/components/admin/BlockNameCell#BlockNameCell",
        },
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
    afterChange: [revalidatePagesUsingGlobalBlock],
    beforeDelete: [preventDeleteIfReferenced],
  },
  labels: {
    plural: { en: "Global sections", es: "Secciones globales" },
    singular: { en: "Global section", es: "Sección global" },
  },
  slug: "globalBlock",
  versions: createLivePreviewVersions(),
};
