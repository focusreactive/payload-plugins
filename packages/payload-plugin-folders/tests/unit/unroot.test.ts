import { describe, expect, it } from "vitest";

import { chooseUnrootSegment, unrootedPathOf } from "../../src/admin/Settings/unroot.js";

/** A folder where only the listed segments are taken. */
const takenIn = (...taken: string[]) => {
  const asked: string[] = [];

  return {
    asked,
    isFree: async (segment: string) => {
      asked.push(segment);

      return !taken.includes(segment);
    },
  };
};

describe("chooseUnrootSegment, the segment the un-root dialog starts with", () => {
  it("keeps the stored slug when it is valid and free in the folder", async () => {
    const folder = takenIn("something-else");

    const segment = await chooseUnrootSegment({
      atSiteRoot: false,
      isFree: folder.isFree,
      storedSlug: "about-us",
      title: "Our Story",
    });

    // The title would give another segment: the stored one wins, and only it is asked about.
    expect(segment).toBe("about-us");
    expect(folder.asked).toEqual(["about-us"]);
  });

  it("falls back to the slugified title when the stored slug is taken", async () => {
    const folder = takenIn("about-us");

    const segment = await chooseUnrootSegment({
      atSiteRoot: false,
      isFree: folder.isFree,
      storedSlug: "about-us",
      title: "Our Story",
    });

    expect(segment).toBe("our-story");
  });

  it("falls back to the title when the stored slug is not a valid segment, without asking the server", async () => {
    const folder = takenIn();

    const segment = await chooseUnrootSegment({
      atSiteRoot: false,
      isFree: folder.isFree,
      storedSlug: "Not Valid!",
      title: "Contact & Press",
    });

    expect(segment).toBe("contact-press");
    expect(folder.asked).toEqual(["contact-press"]);
  });

  it("counts up with -2, -3 until the segment is free", async () => {
    const folder = takenIn("about-us", "our-story", "our-story-2");

    expect(
      await chooseUnrootSegment({
        atSiteRoot: false,
        isFree: folder.isFree,
        storedSlug: "about-us",
        title: "Our Story",
      })
    ).toBe("our-story-3");
    expect(folder.asked).toEqual(["about-us", "our-story", "our-story-2", "our-story-3"]);
  });

  it("goes to the title when the page has no stored slug at all", async () => {
    const folder = takenIn();

    expect(
      await chooseUnrootSegment({
        atSiteRoot: false,
        isFree: folder.isFree,
        storedSlug: null,
        title: "Fresh Page",
      })
    ).toBe("fresh-page");
    expect(
      await chooseUnrootSegment({
        atSiteRoot: false,
        isFree: folder.isFree,
        storedSlug: "",
        title: "Fresh Page",
      })
    ).toBe("fresh-page");
  });

  it("refuses a dotted stored slug at the site root, where a dot belongs to the frontend", async () => {
    const folder = takenIn();

    const atRoot = await chooseUnrootSegment({
      atSiteRoot: true,
      isFree: folder.isFree,
      storedSlug: "robots.txt",
      title: "Robots",
    });
    const inFolder = await chooseUnrootSegment({
      atSiteRoot: false,
      isFree: folder.isFree,
      storedSlug: "robots.txt",
      title: "Robots",
    });

    expect(atRoot).toBe("robots");
    expect(inFolder).toBe("robots.txt");
  });

  it("moves on from a title the site itself uses, which the server reports as not free", async () => {
    // The server's check also refuses reserved root segments, so "api" comes back not free.
    const folder = takenIn("api");

    expect(
      await chooseUnrootSegment({
        atSiteRoot: true,
        isFree: folder.isFree,
        storedSlug: null,
        title: "API",
      })
    ).toBe("api-2");
  });

  it("gives an empty segment for a title with nothing to slugify, for the editor to type", async () => {
    expect(
      await chooseUnrootSegment({
        atSiteRoot: false,
        isFree: takenIn().isFree,
        storedSlug: null,
        title: "!!!",
      })
    ).toBe("");
  });

  it("lets a failed check reach the caller, which shows it", async () => {
    await expect(
      chooseUnrootSegment({
        atSiteRoot: false,
        isFree: async () => {
          throw new Error("offline");
        },
        storedSlug: "about-us",
        title: "About Us",
      })
    ).rejects.toThrow("offline");
  });
});

describe("unrootedPathOf, the URL the dialog shows", () => {
  it("joins the folder's path and the segment, and handles the top level", () => {
    expect(unrootedPathOf("/company", "about-us")).toBe("/company/about-us");
    expect(unrootedPathOf("/", "about-us")).toBe("/about-us");
    expect(unrootedPathOf("", "about-us")).toBe("/about-us");
  });
});
