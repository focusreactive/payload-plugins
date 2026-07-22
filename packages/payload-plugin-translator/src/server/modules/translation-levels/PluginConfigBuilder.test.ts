import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config, Endpoint } from "payload";

import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport";

import { PluginConfigBuilder } from "./PluginConfigBuilder";

const deps = (collections: Array<{ slug: string }> = []) => ({
  collections: collections as unknown as CollectionConfig[],
  basePath: "/translate",
  taskRunnerFactory: { create: vi.fn() },
  schemaMap: new Map(),
  translationProvider: { translate: vi.fn() },
  targetSelection: "single" as const,
});

const ep = (method: string, path: string): Endpoint =>
  ({ method, path, handler: vi.fn() }) as unknown as Endpoint;

const component = (path: string) => ({ path }) as unknown as RawPayloadComponentExport;

describe("PluginConfigBuilder", () => {
  it("deduplicates endpoints by method + path", () => {
    const builder = new PluginConfigBuilder(deps());
    builder.addEndpoints([ep("post", "/translate/enqueue"), ep("post", "/translate/run/:id")]);
    builder.addEndpoints([ep("post", "/translate/enqueue")]); // same method+path → dropped

    const config = {} as Config;
    builder.applyTo(config);

    expect(config.endpoints?.map((e) => `${e.method} ${e.path}`)).toEqual([
      "post /translate/enqueue",
      "post /translate/run/:id",
    ]);
  });

  it("keeps endpoints that differ in method or path", () => {
    const builder = new PluginConfigBuilder(deps());
    builder.addEndpoints([ep("post", "/translate/cancel"), ep("delete", "/translate/cancel")]);

    const config = {} as Config;
    builder.applyTo(config);

    expect(config.endpoints).toHaveLength(2);
  });

  it("attaches components only to managed collections, on the right slot", () => {
    const builder = new PluginConfigBuilder(deps([{ slug: "posts" }]));
    const doc = component("doc");
    const bulk = component("bulk");
    builder.addCollectionComponent("beforeDocumentControls", () => doc);
    builder.addCollectionComponent("beforeListTable", () => bulk);

    const config = {
      collections: [{ slug: "posts" }, { slug: "other" }],
    } as unknown as Config;
    builder.applyTo(config);

    const posts = config.collections![0] as Record<string, any>;
    const other = config.collections![1] as Record<string, any>;
    expect(posts.admin.components.edit.beforeDocumentControls).toEqual([doc]);
    expect(posts.admin.components.beforeListTable).toEqual([bulk]);
    expect(other.admin).toBeUndefined(); // unmanaged collection untouched
  });

  it("registers admin providers into config.admin.components.providers", () => {
    const builder = new PluginConfigBuilder(deps());
    const provider = component("cache");
    builder.addAdminProvider(provider);

    const config = {} as Config;
    builder.applyTo(config);

    expect(config.admin?.components?.providers).toEqual([provider]);
  });

  it("applies config modifiers in registration order", () => {
    const builder = new PluginConfigBuilder(deps());
    const order: string[] = [];
    builder.addConfigModifier((c) => {
      order.push("first");
      return c;
    });
    builder.addConfigModifier((c) => {
      order.push("second");
      return c;
    });

    builder.applyTo({} as Config);

    expect(order).toEqual(["first", "second"]);
  });

  it("does not re-add an endpoint already present in config.endpoints (keeps the existing one)", () => {
    const builder = new PluginConfigBuilder(deps());
    builder.addEndpoints([ep("post", "/translate/enqueue")]);

    const original = ep("post", "/translate/enqueue");
    const config = { endpoints: [original] } as unknown as Config;
    builder.applyTo(config);

    expect(config.endpoints).toHaveLength(1); // not duplicated
    expect(config.endpoints?.[0]).toBe(original); // the pre-existing route is kept, ours skipped
  });

  it("threads a fresh config returned by a modifier through every later write", () => {
    const builder = new PluginConfigBuilder(deps());
    const fresh = {} as Config;
    builder.addConfigModifier(() => fresh); // runner-style: returns a brand-new object
    builder.addAdminProvider(component("cache"));

    const original = {} as Config;
    const result = builder.applyTo(original);

    expect(result).toBe(fresh);
    expect(fresh.admin?.components?.providers).toHaveLength(1); // landed on the fresh config
    expect(original.admin).toBeUndefined(); // not on the original
  });
});
