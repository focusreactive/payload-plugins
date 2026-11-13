import type { ArrayField, Block, Field } from "payload";

import { withSectionVisibility } from "@/lib/fields/section/withSectionVisibility";
import { headingRichText } from "@/lib/fields/site/richText";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

interface SiteBlockOptions {
  slug: string;
  /** The TypeScript interface generated for the block. */
  interfaceName: string;
  /** The section's name in the add-section menu. */
  label: string;
  fields: Field[];
}

export function siteBlock({ slug, interfaceName, label, fields }: SiteBlockOptions): Block {
  return withSectionVisibility({
    fields,
    interfaceName,
    labels: { plural: label, singular: label },
    slug,
    ...getBlockPreviewImage(label),
  });
}

/** A collapsed list whose rows show one of their own fields as the row title. */
export function rowTitle(titleField: string, prefix: string): NonNullable<ArrayField["admin"]> {
  return {
    components: {
      RowLabel: {
        clientProps: { prefix, titleField },
        path: "@/components/admin/RowLabel#RowLabel",
      },
    },
    initCollapsed: true,
  };
}

export const sectionHeading = (description = "The section's heading.") =>
  headingRichText({ description, label: "Heading", name: "heading" });

export const sectionEyebrow: Field = {
  admin: { description: "The small line above the heading. Empty hides it." },
  label: "Eyebrow",
  name: "eyebrow",
  type: "text",
};

export const BACKGROUND_OPTIONS = [
  { label: "None", value: "none" },
  { label: "White", value: "white" },
  { label: "Page tint", value: "bg" },
  { label: "Light blue", value: "light-blue" },
  { label: "Lightest blue", value: "lightest-blue" },
  { label: "Soft blue", value: "tertiary-blue" },
  { label: "Yellow", value: "yellow" },
] as const;

export const backgroundField = (defaultValue = "none"): Field => ({
  admin: { description: "The colour behind the section." },
  defaultValue,
  label: "Background",
  name: "background",
  options: [...BACKGROUND_OPTIONS],
  type: "select",
});

export const imageField = (
  name: string,
  label: string,
  description: string,
  required = false
): Field => ({
  admin: { description },
  label,
  name,
  relationTo: "media",
  required,
  type: "upload",
});

/** The class the site's stylesheet uses for a background choice; "none" adds no class. */
export const backgroundClass = (background: string | null | undefined): string =>
  !background || background === "none" ? "" : background;
