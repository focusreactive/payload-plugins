import type { CollectionBeforeChangeHook } from "payload";

import { readingTimeFromText, readingTimeMinutes } from "@/lib/utils/readingTime";
import { markdownToPlainText } from "@/lib/markdown/plainText";
import type { Post } from "@/payload-types";

export const computeReadingTime: CollectionBeforeChangeHook<Post> = ({ data }) => {
  if (data.contentFormat === "markdown" && typeof data.markdown === "string") {
    data.readingTime = readingTimeFromText(markdownToPlainText(data.markdown));
    return data;
  }

  const content = data.content;

  if (content && typeof content === "object" && "root" in content) {
    data.readingTime = readingTimeMinutes(content as Post["content"]);
  }

  return data;
};
