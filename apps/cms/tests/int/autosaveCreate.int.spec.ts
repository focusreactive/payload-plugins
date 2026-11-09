import type { Payload } from "payload";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import config from "@/payload.config";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(load: T) => load,
}));

const AUTOSAVE_COLLECTIONS = ["page", "posts", "globalBlock"] as const;

type AutosaveCollection = (typeof AUTOSAVE_COLLECTIONS)[number];

let payload: Payload;
const createdDrafts: { collection: AutosaveCollection; id: number }[] = [];

async function openCreateView(collection: AutosaveCollection) {
  const doc = await payload.create({ collection, data: {}, depth: 0, draft: true });
  createdDrafts.push({ collection, id: doc.id });
  return doc;
}

describe("opening Create New with autosave", () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });
  });

  afterAll(async () => {
    for (const { collection, id } of createdDrafts) {
      await payload.delete({ collection, id });
    }
  });

  it.each(AUTOSAVE_COLLECTIONS)("creates a new %s draft every time", async (collection) => {
    const first = await openCreateView(collection);
    const second = await openCreateView(collection);

    expect(second.id).not.toBe(first.id);
  });
});
