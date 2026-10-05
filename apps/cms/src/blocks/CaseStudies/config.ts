import type { Block, Option } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

export const CASE_STUDY_SECTORS: Option[] = [
  { label: "Automotive", value: "automotive" },
  {
    label: "Heavy equipment & agritech",
    value: "agritech",
  },
  { label: "Financial services", value: "finance" },
  { label: "Medical devices", value: "medical" },
  { label: "Other", value: "other" },
];

export const CaseStudiesBlock: Block = injectSection({
  slug: "caseStudies",
  interfaceName: "CaseStudiesBlock",
  ...getBlockPreviewImage("Case Studies"),
  labels: {
    plural: "Case Studies",
    singular: "Case Studies",
  },
  fields: [
    ...sectionHeaderFields(),
    {
      admin: {
        description: "Show only the case studies of one sector (sector pages)",
      },
      defaultValue: "all",
      label: "Filter by sector",
      name: "filterSector",
      options: [{ label: "All sectors", value: "all" }, ...CASE_STUDY_SECTORS],
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
              label: "Title",
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: { width: "40%" },
              label: "Sector",
              name: "sector",
              options: CASE_STUDY_SECTORS,
              required: true,
              type: "select",
            },
          ],
        },
        {
          admin: {
            description: "Comma-separated, e.g. Linux, Yocto, ROS 2",
          },
          label: "Technologies",
          name: "technologies",
          type: "text",
        },
        {
          label: "The problem",
          localized: true,
          name: "problem",
          type: "textarea",
        },
        {
          label: "Our solution",
          localized: true,
          name: "solution",
          type: "textarea",
        },
        {
          label: "Business result",
          localized: true,
          name: "result",
          type: "textarea",
        },
      ],
      label: "Case studies",
      minRows: 1,
      name: "items",
      required: true,
      type: "array",
    },
  ],
});
