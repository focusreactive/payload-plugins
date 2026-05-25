import type { ArrayField, Field } from "payload";

import deepMerge from "@/core/lib/deepMerge";

import type { LinkAppearances } from "./link";
import { link } from "./link";

type LinkGroupType = (options?: {
  appearances?: LinkAppearances[] | false;
  defaultValue?: ArrayField["defaultValue"];
  overrides?: Partial<ArrayField>;
}) => Field;

export const linkGroup: LinkGroupType = ({
  appearances,
  defaultValue,
  overrides = {},
} = {}) => {
  const generatedLinkGroup: Field = {
    admin: {
      components: {
        RowLabel: "@/core/ui/components/RowLabel#RowLabel",
      },
      initCollapsed: true,
    },
    fields: [
      link({
        appearances,
      }),
    ],
    label: { en: "Links", es: "Enlaces" },
    name: "links",
    type: "array",
    ...(defaultValue !== undefined && { defaultValue }),
  };

  return deepMerge(generatedLinkGroup, overrides);
};
