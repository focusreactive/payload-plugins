/**
 * Payload's slugify minus the dot stripping: old-site addresses such as `robotics.html` survive as
 * slugs, so tag, author, post and news pages keep their legacy URLs.
 */
export const slugify = ({ valueToSlugify }: { valueToSlugify?: unknown }): string | undefined =>
  typeof valueToSlugify === "string"
    ? valueToSlugify
        .trim()
        .replaceAll(" ", "-")
        .replaceAll(/[^\w.-]+/gu, "")
        .toLowerCase()
    : undefined;
