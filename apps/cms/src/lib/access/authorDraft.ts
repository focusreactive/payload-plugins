import { author } from "./author";
import type { isAccessible } from "./types";

// Payload asks the same rule with `_status: "published"` to decide whether to show Publish, so this hides it for authors.
export const authorDraft: isAccessible = (args) => {
  if (author(args) !== true) {
    return false;
  }
  const data = "data" in args ? (args.data as { _status?: string } | undefined) : undefined;

  return data?._status !== "published";
};
