function format(value: string, allowed: RegExp): string {
  return value.trim().replaceAll(" ", "-").replaceAll(allowed, "").toLowerCase();
}

/**
 * Payload's slugify minus the dot stripping: old-site addresses such as `robotics.html` survive as
 * slugs, so tag, author and news pages keep their legacy URLs.
 */
export const slugify = ({ valueToSlugify }: { valueToSlugify?: unknown }): string | undefined =>
  typeof valueToSlugify === "string" ? format(valueToSlugify, /[^\w.-]+/gu) : undefined;

/** Post slugs may also hold the old year segment: `2025/reproducible-builds`, `2019/x.html`. */
export const slugifyPostPath = ({
  valueToSlugify,
}: {
  valueToSlugify?: unknown;
}): string | undefined =>
  typeof valueToSlugify === "string"
    ? format(valueToSlugify, /[^\w./-]+/gu)
        .replaceAll(/\/{2,}/gu, "/")
        .replaceAll(/^\/|\/$/gu, "")
    : undefined;
