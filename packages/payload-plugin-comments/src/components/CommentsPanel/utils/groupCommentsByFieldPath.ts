import type { Comment } from "../../../types";
import type { FieldPath } from "../types";
import { sortGroupsByCreatedAt } from "./sortGroupsByCreatedAt";

export function groupCommentsByFieldPath(comments: Comment[]): Map<FieldPath, Comment[]> {
  const groupMap = new Map<FieldPath, Comment[]>();

  for (const comment of comments) {
    const key = comment.fieldPath ?? null;

    if (!groupMap.has(key)) groupMap.set(key, []);

    groupMap.get(key)!.push(comment);
  }

  return sortGroupsByCreatedAt(groupMap);
}
