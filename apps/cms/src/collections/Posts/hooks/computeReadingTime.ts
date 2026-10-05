import type { CollectionBeforeChangeHook } from "payload";

import { readingTimeFromText } from "@/lib/utils/readingTime";
import { markdownToPlainText } from "@/lib/markdown/plainText";
import { extractLexicalText } from "@/lib/utils/text";
import type { Post } from "@/payload-types";

export const computeReadingTime: CollectionBeforeChangeHook<Post> = ({ data }) => {
  const content =
    data.content && typeof data.content === "object" && "root" in data.content
      ? (data.content as Post["content"])
      : null;
  const text = [extractLexicalText(content), markdownToPlainText(data.markdown)].join(" ").trim();

  if (text) {
    data.readingTime = readingTimeFromText(text);
  }

  return data;
};
