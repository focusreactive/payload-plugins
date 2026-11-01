import { describe, expect, it } from "vitest";

import {
  FoldersApiError,
  fetchUnfinishedOperations,
  postDelete,
  postDuplicate,
  postOperationAbandon,
  postOperationStep,
  postPublish,
  previewPublish,
} from "../../src/admin/api.js";

const jsonResponse = (body: unknown, status = 200): Response => Response.json(body, { status });

const recorder = (answer: () => Response) => {
  const requests: Array<{ body: unknown; method: string; url: string }> = [];
  const fetchImplementation = (async (url: string, init?: RequestInit) => {
    requests.push({
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      method: init?.method ?? "GET",
      url,
    });

    return answer();
  }) as typeof fetch;

  return { context: { baseUrl: "/api", fetchImplementation }, requests };
};

describe("the operation requests", () => {
  it("reads only the user's unfinished operations from the last day, without the work list", async () => {
    const { context, requests } = recorder(() =>
      jsonResponse({
        docs: [
          { done: 400, id: 5, kind: "publish", status: "running", total: 980 },
          { done: 0, error: "boom", id: 6, kind: "delete", status: "failed", total: 10 },
        ],
      })
    );

    const operations = await fetchUnfinishedOperations(context, {
      now: new Date("2026-11-01T12:00:00.000Z"),
      userId: 42,
    });

    const url = new URL(requests[0]?.url ?? "", "http://localhost");
    expect(url.pathname).toBe("/api/folder-operations");
    expect(url.searchParams.get("where[and][0][createdBy][equals]")).toBe("42");
    // Neither a finished nor an abandoned one comes back.
    expect(url.searchParams.get("where[and][1][status][in]")).toBe("running,failed");
    expect(url.searchParams.get("where[and][2][updatedAt][greater_than]")).toBe(
      "2026-10-31T12:00:00.000Z"
    );
    expect(url.searchParams.has("select[items]")).toBe(false);
    expect(url.searchParams.get("select[status]")).toBe("true");
    expect(operations).toEqual([
      { done: 400, id: 5, kind: "publish", status: "running", total: 980 },
      { done: 0, error: "boom", id: 6, kind: "delete", status: "failed", total: 10 },
    ]);
  });

  it("asks the publish endpoint for counts with a dry run, and publishes without one", async () => {
    const { context, requests } = recorder(() => jsonResponse({}));

    await previewPublish(context, {
      action: "publish",
      items: [{ collection: "folders", id: 3 }],
      locale: "de",
    });
    await postPublish(context, {
      action: "unpublish",
      items: [{ collection: "pages", id: 4 }],
      locale: null,
    });

    expect(requests[0]?.body).toEqual({
      action: "publish",
      dryRun: true,
      items: [{ collection: "folders", id: 3 }],
      locale: "de",
    });
    expect(requests[1]?.body).toEqual({
      action: "unpublish",
      items: [{ collection: "pages", id: 4 }],
    });
  });

  it("sends the target folder, the overrides and the admin locale of a copy", async () => {
    const { context, requests } = recorder(() => jsonResponse({ created: [] }));

    await postDuplicate(context, {
      items: [{ collection: "pages", id: 4 }],
      locale: "de",
      overrides: { name: "Kopie", slug: "kopie" },
      toFolder: null,
    });

    expect(requests[0]?.url).toBe("/api/folders-tree/duplicate?locale=de");
    expect(requests[0]?.body).toEqual({
      items: [{ collection: "pages", id: 4 }],
      overrides: { name: "Kopie", slug: "kopie" },
      toFolder: null,
    });
  });

  it("sends the confirm word only when there is one", async () => {
    const { context, requests } = recorder(() => jsonResponse({ deleted: 1, trashed: 0 }));

    await postDelete(context, { items: [{ collection: "pages", id: 4 }] });
    await postDelete(context, { confirmWord: "news", items: [{ collection: "folders", id: 2 }] });

    expect(requests[0]?.body).toEqual({ items: [{ collection: "pages", id: 4 }] });
    expect(requests[1]?.body).toEqual({
      confirmWord: "news",
      items: [{ collection: "folders", id: 2 }],
    });
  });

  it("steps an operation by its id", async () => {
    const { context, requests } = recorder(() =>
      jsonResponse({ done: 200, status: "running", total: 980 })
    );

    expect(await postOperationStep(context, 12)).toEqual({
      done: 200,
      status: "running",
      total: 980,
    });
    expect(requests[0]).toMatchObject({
      method: "POST",
      url: "/api/folders-tree/operations/12/step",
    });
  });

  it("abandons an operation by its id and answers how far it got", async () => {
    const { context, requests } = recorder(() =>
      jsonResponse({ done: 400, status: "abandoned", total: 980 })
    );

    expect(await postOperationAbandon(context, 12)).toEqual({
      done: 400,
      status: "abandoned",
      total: 980,
    });
    expect(requests[0]).toMatchObject({
      method: "POST",
      url: "/api/folders-tree/operations/12/abandon",
    });
  });

  it("carries the refusal's reason and its details on the error", async () => {
    const { context } = recorder(() =>
      jsonResponse(
        {
          errors: [
            {
              data: { items: [{ collection: "pages", id: 1 }], reason: "forbidden" },
              message: "You are not allowed to delete everything in this selection",
            },
          ],
        },
        403
      )
    );

    const error = await postDelete(context, { items: [{ collection: "pages", id: 1 }] }).catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(FoldersApiError);
    expect((error as FoldersApiError).reason).toBe("forbidden");
    expect((error as FoldersApiError).data?.items).toHaveLength(1);
  });
});
