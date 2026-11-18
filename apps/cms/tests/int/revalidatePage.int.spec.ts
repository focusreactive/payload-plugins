import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { rememberPublishedPath } from "@/collections/Page/hooks/publishedPath";
import { revalidateDelete, revalidatePage } from "@/collections/Page/hooks/revalidatePage";

vi.mock("@/lib/utils/scopedCache", () => ({ revalidateScopedTag: vi.fn() }));

const page = { breadcrumbs: [{ url: "/about" }], id: 1, slug: "about" };
const movedPage = { ...page, breadcrumbs: [{ url: "/company/about" }] };

function request(locale?: string, publishedDoc: object | null = null) {
  return {
    context: {},
    payload: { findByID: vi.fn(async () => publishedDoc), logger: { info: vi.fn() } },
    searchParams: new URLSearchParams(locale ? { locale } : {}),
  };
}

function args(doc: object, previousDoc: object | undefined, req = request("en")) {
  return { doc, previousDoc, req } as never;
}

async function publish(doc: object, publishedDoc: object) {
  const req = request("en", publishedDoc);
  await rememberPublishedPath({
    data: { _status: "published" },
    operation: "update",
    originalDoc: doc,
    req,
  } as never);
  await revalidatePage(args({ ...doc, _status: "published" }, doc, req));
}

function revalidatedTags() {
  return vi.mocked(revalidateScopedTag).mock.calls.map(([tag]) => tag);
}

describe("page cache revalidation", () => {
  beforeEach(() => {
    vi.mocked(revalidateScopedTag).mockClear();
  });

  it("revalidates every locale when a page is deleted from one locale", async () => {
    await revalidateDelete(args(page, undefined));
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates every locale when a page is unpublished", async () => {
    await revalidatePage(args({ ...page, _status: "draft" }, { ...page, _status: "published" }));
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates every locale when a page is published", async () => {
    await revalidatePage(
      args({ ...page, _status: "published" }, { ...page, _status: "draft" }, request("es"))
    );
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates only the edited locale when a published page changes content", async () => {
    await revalidatePage(
      args({ ...page, _status: "published" }, { ...page, _status: "published" }, request("es"))
    );
    const tags = revalidatedTags();
    expect(tags).toContain("page_about_es");
    expect(tags).not.toContain("page_about_en");
  });

  it("revalidates every page path when a published page moves to another path", async () => {
    await publish(movedPage, { ...page, _status: "published" });
    expect(revalidatedTags()).toContain("page_paths");
  });

  it("keeps other pages cached when a published page keeps its path", async () => {
    await publish(page, { ...page, _status: "published" });
    expect(revalidatedTags()).not.toContain("page_paths");
  });

  it("keeps other pages cached when a page is published for the first time", async () => {
    await publish(page, { ...page, _status: "draft" });
    expect(revalidatedTags()).not.toContain("page_paths");
  });

  it("revalidates every page path when a page is unpublished", async () => {
    const req = request("en", { ...page, _status: "draft" });
    await revalidatePage(
      args({ ...page, _status: "draft" }, { ...page, _status: "published" }, req)
    );
    expect(revalidatedTags()).toContain("page_paths");
  });

  it("keeps other pages cached when a draft is autosaved over a published page", async () => {
    const req = request("en", { ...page, _status: "published" });
    await revalidatePage(
      args({ ...page, _status: "draft" }, { ...page, _status: "published" }, req)
    );
    expect(revalidatedTags()).not.toContain("page_paths");
  });

  it("revalidates every page path when a published page is deleted", async () => {
    await revalidateDelete(args({ ...page, _status: "published" }, undefined));
    expect(revalidatedTags()).toContain("page_paths");
  });
});
