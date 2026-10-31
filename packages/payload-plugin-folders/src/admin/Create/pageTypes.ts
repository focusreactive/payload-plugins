import type { TreeItem } from "../../types.js";

/** A page type a new page can have in a folder. */
export type PageTypeOption = {
  /** The page collection's slug. */
  collection: string;
  /** The folder's default type, which is listed first and preselected. */
  isDefault: boolean;
  label: string;
};

/**
 * The page types a folder offers for a new page (spec section 7.7): its allowed types, or every
 * page type when it restricts none, with the folder's default type first. `null` is the top level,
 * which takes every type and has no default. A type the site no longer has is left out.
 */
export const pageTypeOptionsOf = (
  folder: Pick<TreeItem, "allowedTypes" | "defaultType"> | null,
  typeLabels: Readonly<Record<string, string>>
): PageTypeOption[] => {
  const allowed = folder?.allowedTypes ?? [];
  const slugs = Object.keys(typeLabels).filter(
    (slug) => allowed.length === 0 || allowed.includes(slug)
  );
  const defaultType = slugs.find((slug) => slug === folder?.defaultType) ?? null;
  const ordered =
    defaultType === null ? slugs : [defaultType, ...slugs.filter((slug) => slug !== defaultType)];

  return ordered.map((slug) => ({
    collection: slug,
    isDefault: slug === defaultType,
    label: typeLabels[slug] ?? slug,
  }));
};
