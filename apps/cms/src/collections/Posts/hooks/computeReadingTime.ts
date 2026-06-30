import type { CollectionBeforeChangeHook } from "payload";

import { readingTimeMinutes } from "@/lib/utils/readingTime";
import type { Post } from "@/payload-types";

export const computeReadingTime: CollectionBeforeChangeHook<Post> = ({ data }) => {
  const content = data.content;

  if (content && typeof content === "object" && "root" in content) {
    data.readingTime = readingTimeMinutes(content as Post["content"]);
  }

  return data;
};
