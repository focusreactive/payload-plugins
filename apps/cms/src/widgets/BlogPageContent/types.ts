import type { CardPostData } from "@/lib/types";
import type { Post } from "@/payload-types";

export type BlogListPost = CardPostData & Pick<Post, "content">;
