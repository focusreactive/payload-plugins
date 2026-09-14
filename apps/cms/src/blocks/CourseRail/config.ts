import type { Block } from "payload";

import { injectSection } from "@/lib/fields/section/injectSection";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

import { courseRailFields } from "./fields";

export const CourseRailBlock: Block = injectSection({
  ...getBlockPreviewImage("Course Rail"),
  fields: courseRailFields,
  interfaceName: "CourseRailBlock",
  labels: {
    plural: { en: "Course Rails", es: "Filas de cursos" },
    singular: { en: "Course Rail", es: "Fila de cursos" },
  },
  slug: "courseRail",
});
