import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
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
      label: { en: "Name", es: "Nombre" },
      defaultValue: createLocalizedDefault({ en: "Global section", es: "Sección global" }),
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
        initCollapsed: true,
      },
      blocks: contentBlocks,
      label: { en: "Section", es: "Sección" },
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
    plural: { en: "Reusable sections", es: "Secciones reutilizables" },
    singular: { en: "Reusable section", es: "Sección reutilizable" },
  },
  slug: "globalBlock",
  versions: createLivePreviewVersions(),
};
