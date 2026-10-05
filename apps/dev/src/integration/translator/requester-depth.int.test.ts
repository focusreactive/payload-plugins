import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig, PayloadRequest } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let allowed: { id: string; collection: string };
let refused: { id: string; collection: string };

const TEAMS: CollectionConfig = {
  slug: "teams",
  fields: [{ name: "canTranslate", type: "checkbox" }],
};

const withTeamRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  [TEAMS, ...collections].map((c) => {
    if (c.slug === "users") {
      return {
        ...c,
        fields: [...c.fields, { name: "team", type: "relationship", relationTo: "teams" }],
      } as CollectionConfig;
    }
    if (c.slug !== "docs") return c;
    return {
      ...c,
      access: {
        update: ({
          req,
        }: {
          req: PayloadRequest & { user?: { team?: { canTranslate?: boolean } } | null };
        }) => req.user?.team?.canTranslate === true,
      },
      fields: [
        ...c.fields,
        // Without this, every field inherits the collection's refusal and the write stops at the
        // field prune — the collection rule is never reached and both cases pass against anything.
        { name: "tagline", type: "text", localized: true, access: { update: () => true } },
      ],
    } as CollectionConfig;
  });

const UNTOUCHED_DE = { title: "Eigener Titel", tagline: "Eigene Zeile" };

const germanDoc = async (id: string) =>
  (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: "de",
    draft: true,
  })) as { title?: string; tagline?: string };

const memberOf = async (canTranslate: boolean, email: string) => {
  const team = await ctx.payload.create({
    collection: "teams" as "pages",
    data: { canTranslate } as never,
  });
  const user = await ctx.payload.create({
    collection: "users" as "pages",
    data: { email, password: "pw123456", team: (team as { id: string | number }).id } as never,
  });
  return { id: String((user as { id: string | number }).id), collection: "users" };
};

describe("a host rule that reads through a relationship on the requester", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withTeamRule(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
    allowed = await memberOf(true, "allowed@test.dev");
    refused = await memberOf(false, "refused@test.dev");
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  const seedAndEdit = async (editor: { id: string; collection: string }, title: string) => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Probe", tagline: "Probe line" } as never,
      user: editor as never,
    });
    const id = String(created.id);
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "de",
      data: UNTOUCHED_DE as never,
      draft: true,
    });
    await ctx.payload.update({
      collection: "docs" as "pages",
      id,
      locale: "en",
      data: { title, tagline: "Edited line", _status: "published" } as never,
      user: editor as never,
    });
    return id;
  };

  it("grants, because the requester was rebuilt deep enough for the rule to read it", async () => {
    const id = await seedAndEdit(allowed, "Allowed edited");

    const de = await germanDoc(id);
    expect(
      de.title,
      "a bare id in `team` makes `canTranslate` undefined and this same rule refuses"
    ).toBe("de:Allowed edited");
  });

  it("writes nothing for a member whose team may not translate", async () => {
    const id = await seedAndEdit(refused, "Refused edited");

    const de = await germanDoc(id);
    expect(
      de.title,
      "two guards deliver this — the pre-check refuses, and the write is access-checked. Measured: it reddens only when both are broken, so it pins the outcome rather than either mechanism"
    ).toBe(UNTOUCHED_DE.title);
  });
});
