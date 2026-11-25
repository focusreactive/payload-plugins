import type { Payload, PayloadRequest, Where } from "payload";
import { describe, expect, it, vi } from "vitest";

import { readWorkflowEvents, readWorkflows, throughPath } from "../src/server/access.js";
import { editorialReview } from "./fixtures.js";

/** A payload with `pages` (whose read access is `pagesRead`) and the given `visibility`. */
const payloadWith = (pagesRead: () => unknown, visibility?: { read: () => unknown }) => {
  const find = vi.fn();
  const payload = {
    config: {
      admin: { user: "users" },
      custom: {
        workflows: { workflows: [editorialReview], ...(visibility ? { visibility } : {}) },
      },
    },
    collections: { pages: { config: { access: { read: pagesRead } } } },
    find,
  } as unknown as Payload;
  return { payload, find };
};

const args = (payload: Payload, user: unknown = { id: 1, collection: "users" }) =>
  ({ req: { payload, user, context: {} } as unknown as PayloadRequest }) as never;

const TENANT: Where = { tenant: { in: [7] } };
const NOTHING: Where = { id: { exists: false } };

describe("throughPath", () => {
  it("reads every field of a constraint through a relationship, and/or included", () => {
    expect(
      throughPath(
        { or: [TENANT, { and: [{ a: { equals: 1 } }, { "b.c": { exists: true } }] }] },
        "run"
      )
    ).toEqual({
      or: [
        { "run.tenant": { in: [7] } },
        { and: [{ "run.a": { equals: 1 } }, { "run.b.c": { exists: true } }] },
      ],
    });
  });
});

describe("the read rule with `visibility`", () => {
  it("is the host's rule on runs, and the same rule through `run` on events; no ids resolved", async () => {
    const { payload, find } = payloadWith(() => ({ tenant: { in: [7] } }), { read: () => TENANT });
    expect(await readWorkflows(args(payload))).toEqual(TENANT);
    expect(await readWorkflowEvents(args(payload))).toEqual({ "run.tenant": { in: [7] } });
    expect(find).not.toHaveBeenCalled();
  });

  it("keeps out the subject collections the user may not read at all", async () => {
    const { payload } = payloadWith(() => false, { read: () => TENANT });
    const closed = { subjectCollection: { not_in: ["pages"] } };
    expect(await readWorkflows(args(payload))).toEqual({ and: [closed, TENANT] });
    expect(await readWorkflowEvents(args(payload))).toEqual({
      and: [closed, { "run.tenant": { in: [7] } }],
    });
  });

  it("`true` from the host is no constraint; `false` is one nothing matches, not a refusal", async () => {
    expect(await readWorkflows(args(payloadWith(() => true, { read: () => true }).payload))).toBe(
      true
    );
    const none = payloadWith(() => true, { read: () => false }).payload;
    expect(await readWorkflows(args(none))).toEqual(NOTHING);
    expect(await readWorkflowEvents(args(none))).toEqual(NOTHING);
  });

  it("refuses anyone but a user of the admin user collection, whatever the host says", async () => {
    const { payload } = payloadWith(() => true, { read: () => true });
    expect(await readWorkflows(args(payload, { id: 1, collection: "clients" }))).toBe(false);
    expect(await readWorkflowEvents(args(payload, null))).toBe(false);
  });
});
