import type { Comment } from "../../types";
import type { CommentsFilters } from "../../types/filters";

function resolveId(value: number | { id: number }): number {
  return typeof value === "number" ? value : value.id;
}

export function applyCommentFilters(
  comments: Comment[],
  filters: CommentsFilters,
  userId: number | null
) {
  return comments.filter((comment) => {
    if (!filters.showResolved && comment.isResolved) {return false;}

    if (filters.onlyMyThreads && userId !== null) {
      const authorId = resolveId(comment.author as number | { id: number });
      if (authorId === userId) {return true;}

      const mentionIds = (comment.mentions ?? []).map((m) =>
        resolveId(m.user as number | { id: number })
      );

      return mentionIds.includes(userId);
    }

    return true;
  });
}
