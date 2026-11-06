import { describe, expect, it, vi } from "vitest";
import { findDocsByIds } from "../../src/server/findDocsByIds";

function fakePayload(docs: Array<Record<string, unknown>>) {
  return { find: vi.fn(async () => ({ docs })) };
}

const asPayload = (payload: ReturnType<typeof fakePayload>) =>
  payload as unknown as Parameters<typeof findDocsByIds>[0];

describe("findDocsByIds", () => {
  it("returns no docs without querying when there are no ids", async () => {
    const payload = fakePayload([]);
    const docs = await findDocsByIds(asPayload(payload), {
      collection: "posts",
      ids: [],
      overrideAccess: true,
    });
    expect(docs).toEqual([]);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it("queries every id at once with the given access mode", async () => {
    const payload = fakePayload([{ id: 1 }]);
    await findDocsByIds(asPayload(payload), {
      collection: "posts",
      ids: ["1", "2"],
      overrideAccess: false,
    });
    expect(payload.find).toHaveBeenCalledWith({
      collection: "posts",
      where: { id: { in: ["1", "2"] } },
      depth: 0,
      pagination: false,
      overrideAccess: false,
      disableErrors: true,
      req: undefined,
    });
  });

  it("passes locale, select, depth and req only when provided", async () => {
    const payload = fakePayload([]);
    const req = {} as never;
    await findDocsByIds(asPayload(payload), {
      collection: "posts",
      ids: ["1"],
      overrideAccess: true,
      depth: 2,
      locale: "de",
      select: { title: true },
      req,
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ depth: 2, locale: "de", select: { title: true }, req })
    );
  });

  it("drops docs without a string or number id", async () => {
    const payload = fakePayload([{ id: 1 }, { id: "b" }, { id: null }, { title: "x" }]);
    const docs = await findDocsByIds(asPayload(payload), {
      collection: "posts",
      ids: ["1", "b"],
      overrideAccess: true,
    });
    expect(docs).toEqual([{ id: 1 }, { id: "b" }]);
  });

  it("narrows the id lookup with an extra where clause", async () => {
    const payload = fakePayload([]);
    await findDocsByIds(asPayload(payload), {
      collection: "posts",
      ids: ["1"],
      overrideAccess: false,
      where: { _status: { equals: "published" } },
    });
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { and: [{ id: { in: ["1"] } }, { _status: { equals: "published" } }] },
      })
    );
  });
});
