import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

const ROLLBACK_IS_OBSERVABLE = process.env.DB_ADAPTER === "postgres";

let ctx: TestPayload;
let editor: Record<string, unknown>;

/**
 * Payload calls `killTransaction` from the catch of every operation, so a read that *throws* inside
 * `afterChange` takes the editor's save with it. This fixture is the only shape that tells apart a
 * refusal that cost the translation from one that cost the save.
 */
const mayWriteButNotRead = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug === "users") {
      return {
        ...c,
        fields: [...c.fields, { name: "blind", type: "checkbox" }],
      } as CollectionConfig;
    }
    if (c.slug !== "docs") return c;
    return {
      ...c,
      access: {
        read: ({ req }: { req: { user?: { blind?: boolean } | null } }) => req.user?.blind !== true,
        update: () => true,
      },
    } as CollectionConfig;
  });

type Create = (args: {
  collection: string;
  locale: string;
  data: Record<string, unknown>;
}) => Promise<Record<string, unknown> & { id: string | number }>;

describe.skipIf(!ROLLBACK_IS_OBSERVABLE)(
  "a read the host refuses, inside the editor's own save",
  () => {
    beforeAll(async () => {
      ctx = await bootTestPayload({
        collections: mayWriteButNotRead(buildTestCollections()),
        autoTranslate: { targets: ["de"] },
      });
      const create = ctx.payload.create.bind(ctx.payload) as unknown as Create;
      editor = {
        ...(await create({
          collection: "users",
          locale: "en",
          data: { email: "blind@test.dev", password: "pw123456", blind: true },
        })),
        collection: "users",
      };
    });
    afterAll(async () => {
      await ctx?.cleanup();
    });

    it("costs the translation and nothing of the editor's", async () => {
      const created = await (ctx.payload.create.bind(ctx.payload) as unknown as Create)({
        collection: "docs",
        locale: "en",
        data: { title: "Probe", _status: "published" },
      });
      const id = String(created.id);

      await expect(
        ctx.payload.update({
          collection: "docs" as "pages",
          id,
          locale: "en",
          data: { title: "Editor wrote this", _status: "published" } as never,
          user: editor as never,
        }),
        "a refused read must not throw: Payload would have rolled this save back from its own catch"
      ).resolves.toBeDefined();

      const en = (await ctx.payload.findByID({
        collection: "docs" as "pages",
        id,
        locale: "en",
        draft: true,
      })) as { title?: string };
      expect(en.title, "the editor's save survived the refusal").toBe("Editor wrote this");

      const de = (await ctx.payload.findByID({
        collection: "docs" as "pages",
        id,
        locale: "de",
        draft: true,
      })) as { title?: string };
      expect(
        de.title,
        "and this save's translation did not happen — the German locale still holds what the earlier, unattributed create translated"
      ).not.toContain("Editor wrote this");
    });
  }
);
