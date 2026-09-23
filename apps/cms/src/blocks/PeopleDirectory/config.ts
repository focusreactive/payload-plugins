import type { Block } from "payload";

import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

/**
 * A directory that reads the Person collection when the page renders, rather than cards an editor
 * types in. A new profile, or a changed office or photo, shows up here with no page edit, and the
 * office filter is built from the Office values the profiles actually carry.
 */
export const PeopleDirectoryBlock: Block = injectSection({
  slug: "peopleDirectory",
  interfaceName: "PeopleDirectoryBlock",
  ...getBlockPreviewImage("People Directory"),
  labels: {
    plural: { en: "People directories", es: "Directorios de personas" },
    singular: { en: "People directory", es: "Directorio de personas" },
  },
  fields: [...sectionHeaderFields()],
});
