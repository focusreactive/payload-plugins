import { describe, expect, it, vi } from "vitest";

import { createRequest } from "../createRequest.js";
import { findMatchingIds } from "../findMatchingIds.js";

type Fetch = typeof globalThis.fetch;

describe("the ids a list query matches", () => {
  it("asks Payload's REST for every matching id, unpaginated, and answers them as text", async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ docs: [{ id: 3 }, { id: "a" }] }));
    const request = createRequest({ baseURL: "/api", fetch });
    const where = { title: { like: "fest" } };

    const ids = await findMatchingIds(request, { collection: "pages", where, locale: "en" });

    expect(ids).toEqual(["3", "a"]);
    const url = new URL(String(fetch.mock.calls[0]?.[0]), "http://admin.test");
    expect(url.pathname).toBe("/api/pages");
    expect(JSON.parse(url.searchParams.get("where") ?? "")).toEqual(where);
    expect(url.searchParams.get("pagination")).toBe("false");
    expect(url.searchParams.get("depth")).toBe("0");
    expect(url.searchParams.get("select[id]")).toBe("true");
    expect(url.searchParams.get("locale")).toBe("en");
  });
});
