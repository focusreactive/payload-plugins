import type { Comment } from "../../types";

function matchesLocale(comment: Comment, currentLocale?: string | null) {
  if (!comment.fieldPath) return true;

  if (!comment.locale) return true;

  return comment.locale === currentLocale;
}

export function filterCommentsByLocale(comments: Comment[], currentLocale?: string | null) {
  return comments.filter((c) => matchesLocale(c, currentLocale));
}
