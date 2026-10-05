import type { Post } from "@/payload-types";

export type CardPostData = Pick<
  Post,
  | "slug"
  | "tags"
  | "excerpt"
  | "title"
  | "heroImage"
  | "publishedAt"
  | "updatedAt"
  | "authors"
  | "readingTime"
>;
