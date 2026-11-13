import type { Payload } from "payload";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import config from "@/payload.config";
import type { Page } from "@/payload-types";

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(load: T) => load,
}));

let payload: Payload;
const createdPageIds: number[] = [];

async function createDraft(data: Partial<Page> = {}) {
  const doc = await payload.create({ collection: "page", data, depth: 0, draft: true });
  createdPageIds.unshift(doc.id);
  return doc;
}

async function autosaveTitle(id: number, title: string) {
  const current = await payload.findByID({ collection: "page", depth: 0, draft: true, id });
  return payload.update({
    autosave: true,
    collection: "page",
    data: { ...current, _status: "draft", title },
    depth: 0,
    draft: true,
    id,
  });
}

const breadcrumbUrls = (page: Page) => page.breadcrumbs?.map((crumb) => crumb.url);

describe("page breadcrumbs while autosaving drafts", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config });
  });

  afterAll(async () => {
    for (const id of createdPageIds) {
      await payload.delete({ collection: "page", id });
    }
  });

  it("points at the slug generated in the same save", async () => {
    const draft = await createDraft();

    const titled = await autosaveTitle(draft.id, `Crumb ${draft.id}`);
    const renamed = await autosaveTitle(draft.id, `Crumb ${draft.id} renamed`);

    expect(breadcrumbUrls(titled)).toEqual([`/crumb-${draft.id}`]);
    expect(breadcrumbUrls(renamed)).toEqual([`/crumb-${draft.id}-renamed`]);
  });

  it("keeps the stored slug in the url when an update does not send one", async () => {
    const parent = await createDraft({ title: `Partial parent ${Date.now()}` });
    const child = await createDraft({ title: `Partial child ${Date.now()}` });

    const moved = await payload.update({
      collection: "page",
      data: { parent: parent.id },
      depth: 0,
      draft: true,
      id: child.id,
    });

    expect(breadcrumbUrls(moved)).toEqual([`/${parent.slug}`, `/${parent.slug}/${child.slug}`]);
  });

  it("nests the generated slug under the parent url", async () => {
    const parent = await createDraft({ title: `Parent ${Date.now()}` });
    const child = await createDraft({ parent: parent.id });

    const titled = await autosaveTitle(child.id, `Child ${child.id}`);

    expect(breadcrumbUrls(titled)).toEqual([
      `/${parent.slug}`,
      `/${parent.slug}/child-${child.id}`,
    ]);
  });
});
