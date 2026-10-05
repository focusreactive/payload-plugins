import type { Block } from "payload";

import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const VacanciesListBlock: Block = injectSection({
  slug: "vacanciesList",
  interfaceName: "VacanciesListBlock",
  ...getBlockPreviewImage("Vacancies List"),
  labels: {
    plural: "Vacancies Lists",
    singular: "Vacancies List",
  },
  fields: [
    ...sectionHeaderFields(),
    {
      admin: { description: "Shown when no role is open" },
      defaultValue: "No open roles right now. Check back soon.",
      label: "Empty text",
      localized: true,
      name: "emptyText",
      type: "text",
    },
  ],
});
