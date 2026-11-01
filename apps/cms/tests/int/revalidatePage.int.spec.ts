import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { revalidateDelete, revalidatePage } from "@/collections/Page/hooks/revalidatePage";

vi.mock("@/lib/utils/scopedCache", () => ({ revalidateScopedTag: vi.fn() }));

const page = { breadcrumbs: [{ url: "/about" }], slug: "about" };

function args(doc: object, previousDoc: object | undefined, locale?: string) {
  return {
    doc,
    previousDoc,
    req: {
      context: {},
      payload: { logger: { info: vi.fn() } },
      searchParams: new URLSearchParams(locale ? { locale } : {}),
    },
  } as never;
}

function revalidatedTags() {
  return vi.mocked(revalidateScopedTag).mock.calls.map(([tag]) => tag);
}

describe("page cache revalidation", () => {
  beforeEach(() => {
    vi.mocked(revalidateScopedTag).mockClear();
  });

  it("revalidates every locale when a page is deleted from one locale", async () => {
    await revalidateDelete(args(page, undefined, "en"));
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates every locale when a page is unpublished", async () => {
    await revalidatePage(
      args({ ...page, _status: "draft" }, { ...page, _status: "published" }, "en")
    );
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates every locale when a page is published", async () => {
    await revalidatePage(
      args({ ...page, _status: "published" }, { ...page, _status: "draft" }, "es")
    );
    expect(revalidatedTags()).toEqual(expect.arrayContaining(["page_about_en", "page_about_es"]));
  });

  it("revalidates only the edited locale when a published page changes content", async () => {
    await revalidatePage(
      args({ ...page, _status: "published" }, { ...page, _status: "published" }, "es")
    );
    const tags = revalidatedTags();
    expect(tags).toContain("page_about_es");
    expect(tags).not.toContain("page_about_en");
  });
});
