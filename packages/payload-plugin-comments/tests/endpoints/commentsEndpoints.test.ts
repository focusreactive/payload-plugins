import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import { COMMENTS_ENDPOINT_PATHS } from "../../src/constants";
import { commentsEndpoints } from "../../src/endpoints";

function findEndpoint(path: string) {
  const endpoint = commentsEndpoints.find((e) => e.path === path);

  if (!endpoint) throw new Error(`Endpoint ${path} is not registered`);

  return endpoint;
}

describe("commentsEndpoints", () => {
  it("registers every plugin endpoint", () => {
    expect(commentsEndpoints.map((e) => e.path).sort()).toEqual(
      Object.values(COMMENTS_ENDPOINT_PATHS).sort()
    );
  });

  it("serves comments from the request's Payload on a fresh server instance", async () => {
    const comment = { id: 1, text: "hello" };
    const find = vi
      .fn()
      .mockResolvedValueOnce({ docs: [comment] })
      .mockResolvedValueOnce({ docs: [{ comment: 1 }] });
    const payload = {
      config: { admin: { custom: { commentsPlugin: {} } } },
      find,
      logger: { error: vi.fn() },
    } as unknown as Payload;
    const req = {
      user: { id: 7, collection: "users" },
      payload,
      headers: new Headers(),
      json: async () => ({ docId: "3", filterCollectionSlug: "pages" }),
    } as unknown as PayloadRequest;

    const res = await findEndpoint(COMMENTS_ENDPOINT_PATHS.list).handler(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: [{ ...comment, isReadByCurrentUser: true }],
    });
  });
});
