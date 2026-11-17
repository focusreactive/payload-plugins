import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import {
  LIVE_PREVIEW_BEFORE_DOCUMENT_CONTROLS,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
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
      edit: { beforeDocumentControls: LIVE_PREVIEW_BEFORE_DOCUMENT_CONTROLS },
    },
    defaultColumns: ["title", "block", "updatedAt"],
    group: "Global Components",
    ...createStandalonePreview("globalBlock", "global-block"),
    useAsTitle: "title",
  },
  dbName: "gsec",
  fields: [
    {
      admin: {
        description: {
          en: "Internal name to identify this global block in the picker.",
          es: "Nombre interno para identificar este bloque global en el selector.",
        },
      },
      defaultValue: createLocalizedDefault({ en: "Global Block", es: "Bloque Global" }),
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
        description: {
          en: "The single block this global represents. Edit once, reuse on any page.",
          es: "El único bloque que representa este global. Edítalo una vez y reutilízalo en cualquier página.",
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
    plural: { en: "Global Blocks", es: "Bloques Globales" },
    singular: { en: "Global Block", es: "Bloque Global" },
  },
  slug: "globalBlock",
  versions: createLivePreviewVersions(),
};
