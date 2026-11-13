import type { PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { pageStructureFieldNames } from "../../src/constants.js";
import { buildBulkUpdateGuard } from "../../src/hooks/pages/bulkUpdateGuard.js";
import type { ResolvedPageCollection } from "../../src/types.js";

const guard = buildBulkUpdateGuard({ segmentField: "slug" } as ResolvedPageCollection);

const bulkUpdate = (data: Record<string, unknown>) =>
  guard({
    args: { data, where: { title: { equals: "x" } } },
    collection: {},
    context: {},
    operation: "update",
    req: { context: {} } as PayloadRequest,
  } as unknown as Parameters<typeof guard>[0]);

describe("the bulk update guard", () => {
  it.each([...pageStructureFieldNames, "isFolderRoot", "pathSegment", "slug"])(
    "refuses a bulk update that sets %s",
    (name) => {
      expect(() => bulkUpdate({ [name]: 1 })).toThrow(/several pages at once/u);
    }
  );

  it("lets a bulk update of other fields through", () => {
    expect(() => bulkUpdate({ title: "New" })).not.toThrow();
  });
});
