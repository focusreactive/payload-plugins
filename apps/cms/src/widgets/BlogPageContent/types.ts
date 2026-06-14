import type { CardPostData } from "@/core/types";
import type { Post } from "@/payload-types";

export type BlogListPost = CardPostData & Pick<Post, "content">;
