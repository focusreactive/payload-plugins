import { vercelStegaCombine } from "@vercel/stega";

import type { Post } from "@/payload-types";

const SHAPE = "abc123";

export const markedField = (text: string, path: string) =>
  vercelStegaCombine(text, { collectionSlug: "page", docId: "1", kind: "collection", path }, false);

export const markedNode = (text: string, address = "0.0") =>
  vercelStegaCombine(text, { node: address, shape: SHAPE }, false);

export const paragraphsOf = (texts: readonly string[]): Post["content"] => ({
  root: {
    children: texts.map((text) => ({
      children: [{ text, type: "text", version: 1 }],
      type: "paragraph",
      version: 1,
    })),
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});
