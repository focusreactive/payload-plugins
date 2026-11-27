import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, Payload } from "payload";

import { getAllCollectionIds, visibleIds } from "../collections.js";

/**
 * `authorisedByTheReadFilter` stamps whatever these two return as work the rules were asked about,
 * and the only thing that makes that true is the host's `read` rule being applied. Payload applies
 * it only when the call names a reader, so these pin the argument rather than the result.
 */

const POSTS = "posts" as CollectionSlug;
const ANNA = { id: "anna", collection: "users" };

const payloadAnswering = (...ids: string[]) => {
  const find = vi.fn().mockResolvedValue({ docs: ids.map((id) => ({ id })) });
  return { payload: { find } as unknown as Payload, find };
};

describe("getAllCollectionIds", () => {
  it("reads as the caller, so the host's read rule decides what comes back", async () => {
    const { payload, find } = payloadAnswering("d1");

    await getAllCollectionIds(payload, POSTS, ANNA);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, user: ANNA })
    );
  });

  it("reads unchecked only when there is nobody to read as", async () => {
    const { payload, find } = payloadAnswering("d1");

    await getAllCollectionIds(payload, POSTS, null);

    expect(find.mock.calls[0]?.[0]).not.toHaveProperty("overrideAccess");
  });
});

describe("visibleIds", () => {
  it("reads as the caller, so the host's read rule decides what comes back", async () => {
    const { payload, find } = payloadAnswering("d1");

    await visibleIds(payload, POSTS, ["d1", "d2"], ANNA);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, user: ANNA })
    );
  });

  it("asks nothing at all when it was given no ids", async () => {
    const { payload, find } = payloadAnswering();

    const visible = await visibleIds(payload, POSTS, [], ANNA);

    expect(find).not.toHaveBeenCalled();
    expect(visible.size).toBe(0);
  });
});
