import type { Comment, FilterMode } from "../../../types";

interface Props {
  comments: Comment[];
  filter: FilterMode;
  currentUserId?: number | null;
}

export function filterComments({ comments, filter, currentUserId }: Props) {
  return comments.filter((comment) => {
    if (filter === "open") return !comment.isResolved;

    if (filter === "resolved") return comment.isResolved;

    if (filter === "mentioned") {
      return (
        comment.mentions?.some(({ user: mentionUser }) => {
          if (typeof mentionUser === "number") return mentionUser === currentUserId;

          return mentionUser.id === currentUserId;
        }) ?? false
      );
    }

    return false;
  });
}
