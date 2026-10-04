import type { Block, Option } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

export const CASE_STUDY_SECTORS: Option[] = [
  { label: { en: "Automotive", es: "Automoción" }, value: "automotive" },
  {
    label: { en: "Heavy equipment & agritech", es: "Maquinaria y agrotecnología" },
    value: "agritech",
  },
  { label: { en: "Financial services", es: "Servicios financieros" }, value: "finance" },
  { label: { en: "Medical devices", es: "Dispositivos médicos" }, value: "medical" },
  { label: { en: "Other", es: "Otro" }, value: "other" },
];

export const CaseStudiesBlock: Block = injectSection({
  slug: "caseStudies",
  interfaceName: "CaseStudiesBlock",
  ...getBlockPreviewImage("Case Studies"),
  labels: {
    plural: { en: "Case Studies", es: "Casos de estudio" },
    singular: { en: "Case Studies", es: "Casos de estudio" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      admin: {
        description: {
          en: "Show only the case studies of one sector (sector pages)",
          es: "Muestra solo los casos de un sector (páginas de sector)",
        },
      },
      defaultValue: "all",
      label: { en: "Filter by sector", es: "Filtrar por sector" },
      name: "filterSector",
      options: [{ label: { en: "All sectors", es: "Todos" }, value: "all" }, ...CASE_STUDY_SECTORS],
      type: "select",
    },
    {
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "60%" },
              label: { en: "Title", es: "Título" },
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: { width: "40%" },
              label: { en: "Sector", es: "Sector" },
              name: "sector",
              options: CASE_STUDY_SECTORS,
              required: true,
              type: "select",
            },
          ],
        },
        {
          admin: {
            description: {
              en: "Comma-separated, e.g. Linux, Yocto, ROS 2",
              es: "Separadas por comas",
            },
          },
          label: { en: "Technologies", es: "Tecnologías" },
          name: "technologies",
          type: "text",
        },
        {
          label: { en: "The problem", es: "El problema" },
          localized: true,
          name: "problem",
          type: "textarea",
        },
        {
          label: { en: "Our solution", es: "Nuestra solución" },
          localized: true,
          name: "solution",
          type: "textarea",
        },
        {
          label: { en: "Business result", es: "Resultado" },
          localized: true,
          name: "result",
          type: "textarea",
        },
      ],
      label: { en: "Case studies", es: "Casos" },
      minRows: 1,
      name: "items",
      required: true,
      type: "array",
    },
  ],
});
