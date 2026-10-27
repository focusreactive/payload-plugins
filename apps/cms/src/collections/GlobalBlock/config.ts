import type { CollectionConfig } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

import { preventDeleteIfReferenced } from "./hooks/preventDeleteIfReferenced";
import { revalidatePagesUsingGlobalBlock } from "./hooks/revalidatePagesUsingGlobalBlock";

const globalBlockPreviewPath = (id: unknown, locale: string): string => {
  const prefix = shouldIncludeLocalePrefix(locale) ? `/${locale}` : "";

  return generatePreviewPath({
    collection: "globalBlock",
    path: `${prefix}/preview/global-block/${id}`,
    slug: String(id ?? ""),
  });
};

export const GlobalBlock: CollectionConfig<"globalBlock"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "block", "updatedAt"],
    group: "Global Components",
    livePreview: {
      url: ({ data, locale }) =>
        globalBlockPreviewPath(data?.id, locale.code ?? locale.fallbackLocale),
    },
    preview: (data, { locale }) => globalBlockPreviewPath(data?.id, locale),
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
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};
