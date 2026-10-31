import { APIError } from "payload";
import type { CollectionBeforeOperationHook } from "payload";

import type { ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

const structureFieldNames = ["isFolderRoot", "folder", "orderKey", "structureRevision"];

/**
 * A bulk update (`where` instead of an id) saves every matching page in parallel and reports a
 * failed page in `errors` while the shared transaction commits anyway. The after-write
 * uniqueness check cannot roll such a page back, and two pages saved at once do not see each
 * other's write, so two pages could end up live at one URL while the call reports an error. A
 * bulk update that could change a URL is refused until batch publish (P-27) runs it page by page.
 * An update that touches only other fields, or saves drafts, passes.
 */
export const buildBulkUpdateGuard =
  (page: ResolvedPageCollection): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    if (operation !== "update" || isInternalWrite(req)) {
      return args;
    }
    const bulk = args as {
      data?: Record<string, unknown>;
      id?: unknown;
      publishAllLocales?: unknown;
      where?: unknown;
    };
    if (bulk.id !== undefined || !bulk.where) {
      return args;
    }

    const data = bulk.data ?? {};
    const couldChangeUrl =
      data._status === "published" ||
      Boolean(bulk.publishAllLocales) ||
      [page.segmentField, "pathSegment", ...structureFieldNames].some((name) => name in data);
    if (couldChangeUrl) {
      throw new APIError(
        "Publishing or changing the URL of several pages at once is not supported yet. Publish pages one at a time until batch publish exists.",
        400
      );
    }

    return args;
  };
