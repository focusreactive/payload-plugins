import { useEffect, useState } from "react";

import { isValidSegment } from "../../core/slugify.js";
import type { FolderId, ItemRef } from "../../types.js";
import { fetchCheckSegment } from "../api.js";
import type { FoldersApiContext } from "../api.js";

/** How long typing must pause before the segment is checked against the server. */
export const segmentCheckDelayMs = 300;

export type SegmentStatus =
  | { state: "checking" | "idle" | "invalid" }
  | { message: string; state: "error" | "taken" }
  | { state: "ok" };

type Settled = { key: string; status: SegmentStatus };

/**
 * Whether a segment is valid and free in a folder, for the create dialogs (spec section 7.7): the
 * pattern is checked on the spot, the rest by `GET /check-segment` once typing pauses. Only `ok`
 * lets the dialog create. A result is kept with the text it was for, so a segment typed after it
 * reads as `checking` and never as the previous text's answer.
 */
export const useSegmentCheck = ({
  context,
  enabled = true,
  exclude,
  locale,
  parent,
  segment,
}: {
  context: FoldersApiContext;
  /** Off for a page that is a folder's root page: its own segment is not part of any URL. */
  enabled?: boolean;
  /** The item being edited, which never conflicts with itself. */
  exclude?: ItemRef;
  /** The locale the segment is written in; the default locale when absent. */
  locale?: string | null;
  /** The folder the item goes in; `null` is the top level. */
  parent: FolderId | null;
  segment: string;
}): SegmentStatus => {
  const [settled, setSettled] = useState<Settled | null>(null);
  // Primitives, not the object: a caller's inline `exclude` is a new object every render, which
  // would restart the debounce each time and never let a check run.
  const excludeCollection = exclude?.collection;
  const excludeId = exclude?.id;
  const key = `${parent ?? "root"}|${excludeCollection ?? ""}:${excludeId ?? ""}|${locale ?? ""}|${segment}`;
  const isWorthChecking =
    enabled && segment !== "" && isValidSegment(segment, { atSiteRoot: parent === null });

  useEffect(() => {
    if (!isWorthChecking) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const answer = await fetchCheckSegment(
          context,
          {
            exclude:
              excludeCollection === undefined || excludeId === undefined
                ? undefined
                : { collection: excludeCollection, id: excludeId },
            locale,
            parent,
            segment,
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setSettled({
            key,
            status: answer.ok ? { state: "ok" } : { message: answer.message ?? "", state: "taken" },
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSettled({
            key,
            status: { message: error instanceof Error ? error.message : "", state: "error" },
          });
        }
      }
    }, segmentCheckDelayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [context, excludeCollection, excludeId, isWorthChecking, key, locale, parent, segment]);

  if (!enabled || segment === "") {
    return { state: "idle" };
  }
  if (!isWorthChecking) {
    return { state: "invalid" };
  }

  return settled?.key === key ? settled.status : { state: "checking" };
};
