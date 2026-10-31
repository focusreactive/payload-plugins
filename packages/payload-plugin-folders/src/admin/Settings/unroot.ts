import { isValidSegment, slugify } from "../../core/slugify.js";

/** How far past `-2` the search for a free segment goes before it gives up and shows the base. */
const maxSuffix = 50;

/**
 * The segment the un-root dialog starts with (spec section 4): the page's stored slug when it is
 * valid and free in the folder, else `slugify(title)` with `-2`, `-3` and so on until one is free.
 * `isFree` asks the server (`check-segment`), which also refuses what the site itself uses, so a
 * title that slugifies to a reserved word moves on to `-2` as well.
 */
export const chooseUnrootSegment = async ({
  atSiteRoot,
  isFree,
  storedSlug,
  title,
}: {
  /** The page sits at the top level, where a segment cannot contain a dot. */
  atSiteRoot: boolean;
  isFree: (segment: string) => Promise<boolean>;
  storedSlug: string | null;
  title: string;
}): Promise<string> => {
  if (
    storedSlug !== null &&
    storedSlug !== "" &&
    isValidSegment(storedSlug, { atSiteRoot }) &&
    (await isFree(storedSlug))
  ) {
    return storedSlug;
  }

  const base = slugify(title);
  if (base === "") {
    return "";
  }
  for (let suffix = 1; suffix <= maxSuffix; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (isValidSegment(candidate, { atSiteRoot }) && (await isFree(candidate))) {
      return candidate;
    }
  }

  return base;
};

/** The URL the page gets once it has a segment of its own. */
export const unrootedPathOf = (folderPath: string, segment: string): string =>
  `${folderPath === "/" || folderPath === "" ? "" : folderPath}/${segment}`;
