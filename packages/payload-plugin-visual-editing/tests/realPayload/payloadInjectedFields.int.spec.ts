import { vercelStegaDecode } from "@vercel/stega";
import { beforeAll, describe, expect, it } from "vitest";

import type { PayloadConfigs } from "../support/payloadConfig";

import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";
import { buildPayloadConfigs, fieldsOfCollection } from "../support/payloadConfig";

describe("fields Payload adds to a config", () => {
  let configs: PayloadConfigs;

  const serverSchema = (slug: string) =>
    buildEditableSchema(fieldsOfCollection(configs.server, slug));
  const adminSchema = (slug: string) =>
    buildEditableSchema(fieldsOfCollection(configs.client, slug));

  beforeAll(async () => {
    configs = await buildPayloadConfigs();
  });

  const LAYOUT_SCHEMA = {
    divider: { label: "text" },
    hero: { blockName: "text", heading: "text", items: { caption: "text" } },
  };

  it("marks the text a block holds and the name the editor gives it in the block header", () => {
    expect(serverSchema("pages").layout).toEqual(LAYOUT_SCHEMA);
  });

  it("leaves out the name of a block that does not show it in its header", () => {
    expect(serverSchema("pages").layout).not.toHaveProperty("divider.blockName");
    expect(adminSchema("pages").layout).not.toHaveProperty("divider.blockName");
  });

  it("leaves out the block name when the project excludes it by name", () => {
    const schema = buildEditableSchema(fieldsOfCollection(configs.server, "pages"), {
      excludeFieldNames: ["blockName"],
    });

    expect(schema.layout).not.toHaveProperty("hero.blockName");
  });

  it("marks the block name of a draft read", () => {
    const page = {
      id: "page-1",
      layout: [
        { blockName: "Top of the page", blockType: "hero", heading: "Welcome", id: "row-a" },
      ],
    };
    const [hero] = markRead(page, {
      identity: { collectionSlug: "pages", docId: "page-1", kind: "collection" },
      schema: serverSchema("pages"),
    }).layout;

    expect(vercelStegaDecode(hero?.blockName ?? "")).toEqual({
      collectionSlug: "pages",
      docId: "page-1",
      kind: "collection",
      path: "layout.0.blockName",
    });
    expect(hero?.heading).not.toBe("Welcome");
  });

  it("sends the text a block holds and the name the editor gives it in the block header", () => {
    expect(adminSchema("pages").layout).toEqual(LAYOUT_SCHEMA);
  });

  it("keeps the row ids, the order key and the timestamps of a document out", () => {
    expect(serverSchema("pages")).toMatchObject({ links: { label: "text" }, title: "text" });
    expect(serverSchema("pages")).not.toHaveProperty("_order");
    expect(serverSchema("pages")).not.toHaveProperty("_status");
    expect(serverSchema("pages")).not.toHaveProperty("folder");
    expect(serverSchema("pages")).not.toHaveProperty("createdAt");
    expect(serverSchema("pages")).not.toHaveProperty("updatedAt");
    expect(serverSchema("pages")).not.toHaveProperty("deletedAt");
  });

  it("keeps everything Payload stores about an uploaded file out", () => {
    expect(serverSchema("media")).toEqual({ alt: "text" });
    expect(adminSchema("media")).toEqual({ alt: "text" });
  });

  it("keeps the credentials and sessions of an auth collection out", () => {
    expect(serverSchema("users")).toEqual({
      _verified: "checkbox",
      email: "email",
      enableAPIKey: "checkbox",
      hasAPIKey: "checkbox",
      name: "text",
    });
  });

  it("gives the admin the rule the server marks with", () => {
    expect(adminSchema("users")).toEqual(serverSchema("users"));
    expect(adminSchema("media")).toEqual(serverSchema("media"));
  });
});
