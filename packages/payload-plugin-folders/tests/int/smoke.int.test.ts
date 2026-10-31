import { initTransaction, killTransaction } from "payload";
import type { PayloadRequest } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

describe("dev app smoke", () => {
  it("boots Payload", () => {
    expect(Object.keys(harness.payload.collections)).toEqual(
      expect.arrayContaining(["pages", "posts", "users", "redirects"])
    );
  });

  it("creates a page", async () => {
    const page = await harness.payload.create({
      collection: "pages",
      data: { slug: "hello", title: "Hello" },
      overrideAccess: true,
    });

    expect(page.id).toBeDefined();
    expect(page.title).toBe("Hello");
  });

  it("lists pages through callEndpoint", async () => {
    await harness.payload.create({
      collection: "pages",
      data: { slug: "listed", title: "Listed" },
      overrideAccess: true,
    });

    const { body, status } = await callEndpoint<{ docs: { title: string }[] }>({
      config: harness.config,
      path: "/pages",
      payload: harness.payload,
    });

    expect(status).toBe(200);
    expect(body.docs.map((page) => page.title)).toContain("Listed");
  });

  it("rolls back a failed transaction on SQLite", async () => {
    const { payload } = harness;
    const request = { payload } as PayloadRequest;
    const transactionStarted = await initTransaction(request);
    expect(transactionStarted).toBe(true);

    const rollbackMarker = "rolled-back-page";
    await expect(
      (async () => {
        await payload.create({
          collection: "pages",
          data: { slug: rollbackMarker, title: rollbackMarker },
          overrideAccess: true,
          req: request,
        });
        const { totalDocs: countInsideTransaction } = await payload.count({
          collection: "pages",
          overrideAccess: true,
          req: request,
          where: { title: { equals: rollbackMarker } },
        });
        expect(countInsideTransaction).toBe(1);
        throw new Error("fail after the write");
      })()
    ).rejects.toThrow("fail after the write");
    await killTransaction(request);

    const { totalDocs } = await payload.count({
      collection: "pages",
      overrideAccess: true,
      where: { title: { equals: rollbackMarker } },
    });
    expect(totalDocs).toBe(0);
  });

  it("two getTestPayload calls give independent instances", async () => {
    const first = await getTestPayload();
    await first.payload.create({
      collection: "pages",
      data: { slug: "only-in-first", title: "Only in first" },
      overrideAccess: true,
    });
    await first.destroy();

    const second = await getTestPayload();
    try {
      expect(second.payload).not.toBe(first.payload);
      const { totalDocs } = await second.payload.count({
        collection: "pages",
        overrideAccess: true,
      });
      expect(totalDocs).toBe(0);

      const page = await second.payload.create({
        collection: "pages",
        data: { slug: "in-second", title: "In second" },
        overrideAccess: true,
      });
      expect(page.title).toBe("In second");
    } finally {
      await second.destroy();
    }
  });
});
