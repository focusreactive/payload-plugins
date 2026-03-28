import type { CommentsFilters } from "../../../types/filters";

type EmptyCommentsMessageKey = "noComments" | "noOpenComments" | "noCommentsInMyThreads" | "noOpenCommentsInMyThreads";

export function resolveEmptyCommentsMessageKey(filters: CommentsFilters): EmptyCommentsMessageKey {
  if (!filters.showResolved && filters.onlyMyThreads) return "noOpenCommentsInMyThreads";
  if (!filters.showResolved) return "noOpenComments";
  if (filters.onlyMyThreads) return "noCommentsInMyThreads";

  return "noComments";
}
