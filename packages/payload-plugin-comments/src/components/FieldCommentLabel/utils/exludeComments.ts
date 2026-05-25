import type { Comment } from "../../../types";

export function excludeComments(
  comments: Comment[] | null,
  path: string | undefined,
  currentLocale?: string | null
) {
  if (!path) {return [];}

  return (comments ?? []).filter(({ fieldPath, locale }) => {
    if (fieldPath !== path) {return false;}

    if (locale && currentLocale && locale !== currentLocale) {return false;}

    return true;
  });
}
