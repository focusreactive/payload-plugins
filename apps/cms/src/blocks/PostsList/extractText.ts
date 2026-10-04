import type { PostsListBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractPostsListText(block: PostsListBlock): string {
  return joinText([block.eyebrow, block.heading, block.description]);
}
