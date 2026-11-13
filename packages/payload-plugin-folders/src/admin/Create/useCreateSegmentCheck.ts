import type { FolderId } from "../../types.js";
import type { FoldersApiContext } from "../api.js";
import type { CreateLocales } from "./localizedValues.js";
import { useSegmentCheck } from "./useSegmentCheck.js";
import type { SegmentStatus } from "./useSegmentCheck.js";

/** The answer that matters most when two locales were checked: a refusal before a wait before a go. */
const severity: Record<SegmentStatus["state"], number> = {
  checking: 3,
  error: 1,
  idle: 4,
  invalid: 0,
  ok: 5,
  taken: 2,
};

/**
 * `useSegmentCheck` for a new item. The segment is written in the default locale and, when the
 * admin shows another one, in that locale too (`localizeNewValues`), so it has to be valid and free
 * in both.
 */
export const useCreateSegmentCheck = ({
  context,
  enabled = true,
  locales,
  parent,
  segment,
}: {
  context: FoldersApiContext;
  enabled?: boolean;
  locales: CreateLocales;
  parent: FolderId | null;
  segment: string;
}): SegmentStatus => {
  const isOtherLocale =
    locales.current !== null && locales.default !== null && locales.current !== locales.default;
  const inDefault = useSegmentCheck({ context, enabled, parent, segment });
  const inCurrent = useSegmentCheck({
    context,
    enabled: enabled && isOtherLocale,
    locale: locales.current,
    parent,
    segment,
  });
  if (!isOtherLocale) {
    return inDefault;
  }

  return severity[inCurrent.state] < severity[inDefault.state] ? inCurrent : inDefault;
};
