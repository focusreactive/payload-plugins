import type { CollectionConfig, Field } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { callEndpoint } from "../helpers/callEndpoint.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { buildPathSegmentField } from "../../src/fields/pageFields.js";

// Build-lead decision 11: pathSegment carries `access.update: () => false`. Does a field-level
// beforeChange hook still set it on update, when the request does not override access?
const segmentHook: Field = {
  ...buildPathSegmentField(true),
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => (data?.slug as string | undefined) ?? originalDoc?.slug,
    ],
  },
} as Field;

const probeFields: Field[] = [{ name: "slug", type: "text", localized: true }];

const withHook = {
  fields: [...probeFields, segmentHook],
  slug: "segment-probe",
} as CollectionConfig;
const withoutHook = {
  fields: [...probeFields, buildPathSegmentField(true)],
  slug: "segment-control",
} as CollectionConfig;

const withHookAndDrafts = {
  fields: [...probeFields, segmentHook],
  slug: "segment-probe-drafts",
  versions: { drafts: true },
} as CollectionConfig;

let harness: TestPayload;
let user: unknown;

type ProbeDoc = { id: number; pathSegment?: string | Record<string, string> };
// The probe collections are not in the generated types, so the Local API is called loosely.
type LooseLocalApi = {
  create: (options: Record<string, unknown>) => Promise<ProbeDoc>;
  findByID: (options: Record<string, unknown>) => Promise<ProbeDoc>;
  update: (options: Record<string, unknown>) => Promise<ProbeDoc>;
};
const looseApi = (): LooseLocalApi => harness.payload as unknown as LooseLocalApi;

beforeAll(async () => {
  harness = await getTestPayload({ extraCollections: [withHook, withoutHook, withHookAndDrafts] });
  await harness.payload.create({
    collection: "users",
    data: { email: "segment-user@example.com", password: "test-password", role: "admin" },
    overrideAccess: true,
  });
  ({ user } = await harness.payload.login({
    collection: "users",
    data: { email: "segment-user@example.com", password: "test-password" },
  }));
});

afterAll(async () => {
  await harness?.destroy();
});

describe("pathSegment with access.update false", () => {
  it("a request cannot write pathSegment when no hook sets it", async () => {
    const created = await looseApi().create({
      collection: "segment-control",
      data: { pathSegment: "chosen", slug: "first" },
      overrideAccess: false,
      user,
    });
    const updated = await looseApi().update({
      collection: "segment-control",
      data: { pathSegment: "attacker", slug: "second" },
      id: created.id,
      overrideAccess: false,
      user,
    });

    // The access function is live: an incoming value on update is dropped.
    expect(updated.pathSegment).toBe("chosen");
  });

  it("a field beforeChange hook sets pathSegment on update and on create", async () => {
    const { payload } = harness;
    const created = await looseApi().create({
      collection: "segment-probe",
      data: { slug: "first" },
      overrideAccess: false,
      user,
    });
    expect(created.pathSegment).toBe("first");

    const updated = await looseApi().update({
      collection: "segment-probe",
      data: { pathSegment: "attacker", slug: "second" },
      id: created.id,
      overrideAccess: false,
      user,
    });
    expect(updated.pathSegment).toBe("second");

    const rest = await callEndpoint<{ doc: { pathSegment: string } }>({
      body: { pathSegment: "attacker", slug: "third" },
      config: harness.config,
      method: "PATCH",
      path: `/segment-probe/${created.id}`,
      payload,
    });
    expect(rest.body.doc.pathSegment).toBe("third");
  });

  it("the hook writes only the locale of the request", async () => {
    const created = await looseApi().create({
      collection: "segment-probe",
      data: { slug: "english" },
      overrideAccess: false,
      user,
    });
    await looseApi().update({
      collection: "segment-probe",
      data: { slug: "deutsch" },
      id: created.id,
      locale: "de",
      overrideAccess: false,
      user,
    });

    const allLocales = await looseApi().findByID({
      collection: "segment-probe",
      id: created.id,
      locale: "all",
      overrideAccess: true,
    });
    expect(allLocales.pathSegment).toEqual({ de: "deutsch", en: "english" });
  });

  it("the hook also sets pathSegment on a draft save of a versioned collection", async () => {
    const created = await looseApi().create({
      collection: "segment-probe-drafts",
      data: { slug: "published-slug", _status: "published" },
      overrideAccess: false,
      user,
    });

    await looseApi().update({
      collection: "segment-probe-drafts",
      data: { pathSegment: "attacker", slug: "draft-slug" },
      draft: true,
      id: created.id,
      overrideAccess: false,
      user,
    });

    const draft = await looseApi().findByID({
      collection: "segment-probe-drafts",
      draft: true,
      id: created.id,
      overrideAccess: true,
    });
    const published = await looseApi().findByID({
      collection: "segment-probe-drafts",
      id: created.id,
      overrideAccess: true,
    });
    expect(draft.pathSegment).toBe("draft-slug");
    expect(published.pathSegment).toBe("published-slug");
  });
});
