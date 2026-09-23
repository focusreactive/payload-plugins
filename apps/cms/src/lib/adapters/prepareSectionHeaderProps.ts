import type { SectionHeaderEyebrow, SectionHeaderProps } from "@/components/SectionHeader";

export interface SectionHeaderInput {
  eyebrow?: string | null;
  heading?: string | null;
  description?: React.ReactNode;
  size?: SectionHeaderProps["size"];
  align?: SectionHeaderProps["align"];
  eyebrowVariant?: SectionHeaderEyebrow["variant"];
  isFirstBlock?: SectionHeaderProps["isFirstBlock"];
}

export function prepareSectionHeaderProps({
  eyebrow,
  heading,
  description,
  size,
  align,
  eyebrowVariant,
  isFirstBlock,
}: SectionHeaderInput): SectionHeaderProps | null {
  if (!eyebrow && !heading && !description) {
    return null;
  }

  return {
    align,
    eyebrow: eyebrow ? { text: eyebrow, variant: eyebrowVariant } : null,
    isFirstBlock,
    size,
    subtitle: description,
    title: heading,
  };
}
