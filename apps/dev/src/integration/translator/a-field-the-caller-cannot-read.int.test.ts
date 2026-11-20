import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "secret", type: "text", localized: true, access: { read: () => false } },
  ],
};

let ctx: TestPayload;
let id: string;
let reader: { id: string; collection: string };

const outcomeOf = async (call: Promise<{ status: number; data: unknown }>) => {
  const { status, data } = await call;
  const message = (data as { message?: string } | undefined)?.message;
  return { status, message: message ?? "" };
};

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs] });
  const user = await ctx.payload.create({
    collection: "users" as "docs",
    data: { email: "reader@test.dev", password: "pw123456" } as never,
  });
  reader = { id: String((user as { id: string | number }).id), collection: "users" };

  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { title: "An English title", secret: "Not for everyone" },
  });
  id = String(made.id);
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("reading the state as someone who may not read every translatable field", () => {
  it("answers for the document, and names no field the caller may not read", async () => {
    const asked = await outcomeOf(
      callEndpoint(
        ctx.payload,
        "get",
        "/translate/document-state/:collection_slug/:collection_id",
        {
          routeParams: { collection_slug: "docs", collection_id: id },
          user: reader,
        }
      )
    );

    expect({ status: asked.status, namesTheField: asked.message.includes("secret") }).toStrictEqual(
      {
        status: 200,
        namesTheField: false,
      }
    );
  });

  it("answers for the list the same way", async () => {
    const asked = await outcomeOf(
      callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
        routeParams: { collection_slug: "docs" },
        query: `ids=${id}`,
        user: reader,
      })
    );

    expect({ status: asked.status, namesTheField: asked.message.includes("secret") }).toStrictEqual(
      {
        status: 200,
        namesTheField: false,
      }
    );
  });

  it("refuses a partial run for the locale's sake, which is the real reason", async () => {
    const asked = await outcomeOf(
      callEndpoint(ctx.payload, "post", "/translate/enqueue", {
        user: reader,
        body: {
          source_lng: "en",
          target_lng: "de",
          collection_slug: "docs",
          collection_id: [id],
          filters: [{ kind: "leaves", addresses: ["title"] }],
        },
      })
    );

    expect({ status: asked.status, namesTheField: asked.message.includes("secret") }).toStrictEqual(
      {
        status: 400,
        namesTheField: false,
      }
    );
  });
});
