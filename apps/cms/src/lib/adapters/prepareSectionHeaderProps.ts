import type { SectionHeaderEyebrow, SectionHeaderProps } from "@/components/ui";

export interface SectionHeaderInput {
  eyebrow?: string | null;
  heading?: string | null;
  description?: React.ReactNode;
  size?: SectionHeaderProps["size"];
  align?: SectionHeaderProps["align"];
  eyebrowVariant?: SectionHeaderEyebrow["variant"];
}

export function prepareSectionHeaderProps({ eyebrow, heading, description, size, align, eyebrowVariant }: SectionHeaderInput): SectionHeaderProps | null {
  if (!eyebrow && !heading && !description) {
    return null;
  }

  return {
    align,
    eyebrow: eyebrow ? { text: eyebrow, variant: eyebrowVariant } : null,
    size,
    subtitle: description,
    title: heading,
  };
}
