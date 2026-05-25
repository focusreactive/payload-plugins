import type { Comment } from "../../../types";
import type { FieldPath } from "../types";

export function sortGroupsByCreatedAt(groupMap: Map<FieldPath, Comment[]>): Map<FieldPath, Comment[]> {
  const toTime = (c: Comment) => new Date(c.createdAt).getTime();
  const oldest = (arr: Comment[]) => Math.min(...arr.map(toTime));

  return new Map(
    [...groupMap.entries()]
      .sort(([, a], [, b]) => oldest(a) - oldest(b))
      .map(([key, arr]) => [key, [...arr].sort((a, b) => toTime(a) - toTime(b))]),
  );
}
