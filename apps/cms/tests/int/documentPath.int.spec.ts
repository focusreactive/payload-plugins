import { describe, expect, it } from "vitest";

import { getDocumentPath } from "@/lib/utils/path/getDocumentPath";
import { localizePath } from "@/lib/utils/path/localizePath";

const nestedPage = {
  breadcrumbs: [
    { label: "Company", url: "/company" },
    { label: "Team", url: "/company/team" },
    { label: "Engineering", url: "/company/team/engineering" },
  ],
  slug: "engineering",
};

describe("getDocumentPath", () => {
  it("builds a page path from its breadcrumbs, not its slug", () => {
    expect(getDocumentPath({ relationTo: "page", value: nestedPage })).toBe(
      "/company/team/engineering"
    );
  });

  it("falls back to the slug of a page without breadcrumbs", () => {
    expect(getDocumentPath({ relationTo: "page", value: { slug: "about" } })).toBe("/about");
  });

  it("points the home page to the root", () => {
    const home = { breadcrumbs: [{ url: "/home" }], slug: "home" };
    expect(getDocumentPath({ relationTo: "page", value: home })).toBe("/");
  });

  it("puts a post under the blog", () => {
    expect(getDocumentPath({ relationTo: "posts", value: { slug: "launch-notes" } })).toBe(
      "/blog/launch-notes"
    );
  });

  it("gives nothing for a document that is not populated", () => {
    expect(getDocumentPath({ relationTo: "page", value: 12 })).toBeUndefined();
    expect(getDocumentPath({ relationTo: "posts", value: {} })).toBeUndefined();
  });
});

describe("localizePath", () => {
  it("leaves a path of the default locale as it is", () => {
    expect(localizePath("/company/team", "en")).toBe("/company/team");
  });

  it("prefixes a path of another locale, the root included", () => {
    expect(localizePath("/company/team", "es")).toBe("/es/company/team");
    expect(localizePath("/", "es")).toBe("/es");
  });
});
