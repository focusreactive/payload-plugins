import type { AccessArgs, Config, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { restrictApiAccess } from "@/lib/plugins/restrictApiAccess";

const allow = () => true;

const baseConfig = {
  collections: [
    {
      access: { create: allow, read: allow, update: allow },
      fields: [],
      slug: "media",
      upload: true,
    },
    { access: { read: allow }, fields: [], slug: "page" },
    { fields: [], slug: "no-access" },
  ],
  globals: [
    { access: { read: allow, update: allow }, fields: [], slug: "site-settings" },
    { access: { read: allow }, fields: [], slug: "_abManifest" },
  ],
} as unknown as Config;

const args = (
  payloadAPI: PayloadRequest["payloadAPI"],
  user: unknown = null,
  isReadingStaticFile = false
) => ({ isReadingStaticFile, req: { payloadAPI, user } }) as unknown as AccessArgs;

const sanitize = () =>
  restrictApiAccess({
    collectionsWithPublicFiles: ["media"],
    globalsWithPublicRead: ["_abManifest"],
  })(baseConfig) as Config;

const collection = (config: Config, slug: string) =>
  config.collections!.find((c) => c.slug === slug)!;
const global = (config: Config, slug: string) => config.globals!.find((g) => g.slug === slug)!;

describe("restrictApiAccess", () => {
  it("denies anonymous REST and GraphQL requests to collections", async () => {
    const config = sanitize();
    const read = collection(config, "page").access!.read!;

    expect(await read(args("REST"))).toBe(false);
    expect(await read(args("GraphQL"))).toBe(false);
  });

  it("defers to the original access for authenticated requests", async () => {
    const config = sanitize();
    const user = { collection: "users", id: 1 };

    expect(await collection(config, "page").access!.read!(args("REST", user))).toBe(true);
    expect(await global(config, "site-settings").access!.update!(args("REST", user))).toBe(true);
  });

  it("leaves the Local API untouched", async () => {
    const config = sanitize();

    expect(await collection(config, "page").access!.read!(args("local"))).toBe(true);
    expect(await global(config, "site-settings").access!.read!(args("local"))).toBe(true);
  });

  it("denies anonymous REST requests to globals", async () => {
    const config = sanitize();

    expect(await global(config, "site-settings").access!.read!(args("REST"))).toBe(false);
    expect(await global(config, "site-settings").access!.update!(args("REST"))).toBe(false);
  });

  it("keeps allowlisted global reads public", async () => {
    const config = sanitize();

    expect(await global(config, "_abManifest").access!.read!(args("REST"))).toBe(true);
  });

  it("keeps static files public only for allowlisted upload collections", async () => {
    const config = sanitize();
    const media = collection(config, "media").access!;

    expect(await media.read!(args("REST", null, true))).toBe(true);
    expect(await media.read!(args("REST"))).toBe(false);
    expect(await media.create!(args("REST", null, true))).toBe(false);
  });

  it("keeps Payload's default (login required) when access is not defined", () => {
    expect(collection(sanitize(), "no-access").access).toBeUndefined();
  });
});
