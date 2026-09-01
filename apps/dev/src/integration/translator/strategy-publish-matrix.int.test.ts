import type { CollectionConfig, Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Slug = "docs" | "versioned";
type Locale = "en" | "de";

const SOURCE = "Hello world";
const MACHINE = [...SOURCE].reverse().join("");
const REVIEWED = "REVIEWED BY A HUMAN";

let payload: Payload;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const collections: CollectionConfig[] = [
    { slug: "users", auth: true, fields: [] },
    {
      slug: "docs",
      versions: { drafts: true },
      fields: [{ name: "title", type: "text", localized: true }],
    },
    {
      slug: "versioned",
      versions: true,
      fields: [{ name: "title", type: "text", localized: true }],
    },
  ];
  ({ payload, cleanup } = await bootTestPayload({ collections }));
});

afterAll(async () => {
  await cleanup();
});

const findDoc = (collection: Slug, id: string, locale: Locale, draft: boolean) =>
  payload.findByID({
    collection: collection as "docs",
    id,
    locale: locale as "en",
    draft,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

const updateDoc = (
  collection: Slug,
  id: string,
  locale: Locale,
  data: Record<string, unknown>,
  opts: { draft?: boolean } = {}
) =>
  payload.update({ collection: collection as "docs", id, locale: locale as "en", ...opts, data });

const createDoc = async (collection: Slug, data: Record<string, unknown>): Promise<string> => {
  const doc = await payload.create({ collection: collection as "docs", locale: "en", data });
  return String(doc.id);
};

const read = (id: string, draft: boolean) => findDoc("docs", id, "de", draft);

async function seedReviewedTranslation(layer: "published" | "draft"): Promise<string> {
  const id = await createDoc("docs", { title: SOURCE, _status: "published" });
  await updateDoc("docs", id, "de", { title: REVIEWED }, layer === "draft" ? { draft: true } : {});
  return id;
}

const translate = async (
  id: string,
  strategy: "overwrite" | "skip_existing",
  publish: boolean,
  collection: Slug = "docs"
): Promise<void> => {
  const res = await callEndpoint(payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: collection,
      collection_id: [id],
      strategy,
      publish_on_translation: publish,
    },
  });
  expect(res.status).toBe(200);
};

describe("strategy x publish-on-translation", () => {
  describe("the existing translation is published", () => {
    it("overwrite without publishing: replaces it in the draft, leaves the live value alone", async () => {
      const id = await seedReviewedTranslation("published");
      await translate(id, "overwrite", false);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("overwrite with publishing: replaces it in both layers", async () => {
      const id = await seedReviewedTranslation("published");
      await translate(id, "overwrite", true);

      expect((await read(id, false)).title).toBe(MACHINE);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("skip_existing without publishing: leaves it alone", async () => {
      const id = await seedReviewedTranslation("published");
      await translate(id, "skip_existing", false);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });

    it("skip_existing with publishing: leaves it alone", async () => {
      const id = await seedReviewedTranslation("published");
      await translate(id, "skip_existing", true);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });
  });

  describe("the existing translation is a draft awaiting review", () => {
    it("overwrite without publishing: replaces it, and nothing goes live", async () => {
      const id = await seedReviewedTranslation("draft");
      await translate(id, "overwrite", false);

      expect((await read(id, false)).title).toBeUndefined();
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("overwrite with publishing: replaces it and publishes the replacement", async () => {
      const id = await seedReviewedTranslation("draft");
      await translate(id, "overwrite", true);

      expect((await read(id, false)).title).toBe(MACHINE);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("skip_existing without publishing: keeps the reviewer's text, publishes nothing", async () => {
      const id = await seedReviewedTranslation("draft");
      await translate(id, "skip_existing", false);

      expect((await read(id, false)).title).toBeUndefined();
      expect((await read(id, true)).title).toBe(REVIEWED);
    });

    it("skip_existing with publishing: publishes the reviewer's text rather than re-translating it", async () => {
      const id = await seedReviewedTranslation("draft");
      await translate(id, "skip_existing", true);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });
  });

  describe("an emptied source", () => {
    it("still publishes the current draft, because that is what the flag asks for", async () => {
      const id = await createDoc("docs", { title: SOURCE, _status: "published" });
      // Clear the English source before the German draft exists: a plain `payload.update` on a
      // drafts collection is a publishing write, so the reverse order takes the draft live in
      // setup and the case passes vacuously.
      await updateDoc("docs", id, "de", { title: "PUBLISHED DE" });
      await updateDoc("docs", id, "en", { title: "" });
      await updateDoc("docs", id, "de", { title: "UNREVIEWED DRAFT DE" }, { draft: true });

      await translate(id, "overwrite", true);

      expect((await read(id, false)).title).toBe("UNREVIEWED DRAFT DE");
    });
  });

  describe("there is nothing to translate", () => {
    it("publishes anyway when everything is already translated", async () => {
      const id = await createDoc("docs", { title: SOURCE, _status: "published" });
      await updateDoc("docs", id, "de", { title: REVIEWED });
      await updateDoc("docs", id, "en", { _status: "draft" });
      expect((await findDoc("docs", id, "en", false))._status).toBe("draft");

      await translate(id, "skip_existing", true);

      expect((await findDoc("docs", id, "en", false))._status).toBe("published");
      expect((await read(id, false)).title).toBe(REVIEWED);
    });

    it("publishes nothing when it is not asked to publish", async () => {
      const id = await createDoc("docs", { title: SOURCE, _status: "draft" });
      await updateDoc("docs", id, "de", { title: REVIEWED }, { draft: true });

      await translate(id, "skip_existing", false);

      expect((await findDoc("docs", id, "en", false))._status).toBe("draft");
      expect((await read(id, true)).title).toBe(REVIEWED);
    });

    it("publishes anyway when the source has no translatable content", async () => {
      const id = await createDoc("docs", { title: "", _status: "draft" });

      await translate(id, "overwrite", true);

      expect((await findDoc("docs", id, "en", false))._status).toBe("published");
    });
  });

  describe("a collection with versions but no drafts", () => {
    it("skip_existing writes nothing when the target is already translated", async () => {
      const id = await createDoc("versioned", { title: SOURCE });
      await updateDoc("versioned", id, "de", { title: REVIEWED });
      const before = await findDoc("versioned", id, "de", false);

      await translate(id, "skip_existing", false, "versioned");

      const after = await findDoc("versioned", id, "de", false);

      expect(after.title).toBe(REVIEWED);
      expect(after.updatedAt, "no write happened").toBe(before.updatedAt);
    });
  });
});
