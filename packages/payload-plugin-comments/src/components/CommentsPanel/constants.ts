import type { FilterMode } from "../../types";

export const FILTER_NO_COMMENTS_KEYS: Record<FilterMode, string> = {
  open: "comments:noOpenComments",
  resolved: "comments:noResolvedComments",
  mentioned: "comments:noMentionedComments",
};
