import { describe, expect, it } from "vitest";

import { describeIssue } from "../../src/admin/Repair/issueLines.js";
import type { TreeIssue } from "../../src/core/treeIssues.js";
import { translateWith } from "../helpers/translate.js";

const english = translateWith("en");
const german = translateWith("de");

const folder = (id: number, title: string | null) => ({
  collection: "folders",
  id,
  kind: "folder" as const,
  title,
});
const page = (id: number, title: string | null) => ({
  collection: "pages",
  id,
  kind: "page" as const,
  title,
});

describe("the lines of the Rebuild dialog", () => {
  it("names a folder by its title and says every locale that drifted", () => {
    const issue: TreeIssue = {
      fixable: true,
      fullPath: [
        { expected: "/docs/guide", locale: "en", stored: "/elsewhere/guide" },
        { expected: "/docs/anleitung", locale: "de", stored: null },
      ],
      item: folder(7, "Guide"),
      kind: "folderPath",
      message: "Folder 7 should be at /docs/guide in en but holds /elsewhere/guide",
      path: "/docs/guide",
    };

    expect(describeIssue(issue, english)).toBe(
      'Folder "Guide" is at the wrong URL (en: holds /elsewhere/guide, should be /docs/guide; de: holds none, should be /docs/anleitung)'
    );
    expect(describeIssue(issue, german)).toBe(
      'Ordner "Guide" hat die falsche URL (en: hat /elsewhere/guide, sollte /docs/guide sein; de: hat keins, sollte /docs/anleitung sein)'
    );
  });

  it("falls back to the id when no title could be read, and drops the locale of an unlocalized site", () => {
    const issue: TreeIssue = {
      fixable: true,
      fullPath: [{ expected: "/a", locale: null, stored: "/b" }],
      item: folder(12, null),
      kind: "folderPath",
      message: "",
      path: "/a",
    };

    expect(describeIssue(issue, english)).toBe(
      "Folder 12 is at the wrong URL (holds /b, should be /a)"
    );
    // No kind and no title, as a quick pass leaves them: the id, in the kind the issue is about.
    expect(
      describeIssue({ ...issue, item: { collection: "folders", id: 3 } } as TreeIssue, english)
    ).toBe("Folder 3 is at the wrong URL (holds /b, should be /a)");
  });

  it("says a folder with only stale ancestry stays where it is", () => {
    const issue: TreeIssue = {
      fixable: true,
      fullPath: [],
      item: folder(2, "Docs"),
      kind: "folderPath",
      message: "",
      path: "/docs",
    };

    expect(describeIssue(issue, english)).toBe(
      'Folder "Docs" has out-of-date ancestry data and stays at /docs'
    );
  });

  it("says a held-back folder stays as it is", () => {
    const issue: TreeIssue = {
      fixable: false,
      fullPath: [{ expected: "/alpha", locale: "en", stored: "/beta" }],
      item: folder(2, "Beta"),
      kind: "folderPath",
      message: "",
      path: "/alpha",
    };

    expect(describeIssue(issue, english)).toBe(
      'Folder "Beta" would take a URL that another item already has (en: holds /beta, should be /alpha), so it stays as it is'
    );
  });

  it("names the claimants of a duplicate path, a few of them and the count of the rest", () => {
    const issue: TreeIssue = {
      count: 7,
      fixable: false,
      items: [
        page(1, "About us"),
        folder(2, "About"),
        page(3, null),
        page(4, "Team"),
        page(5, "Jobs"),
        page(6, "Press"),
        page(7, "News"),
      ],
      kind: "duplicatePath",
      locale: "en",
      message: "",
      path: "/about",
    };

    expect(describeIssue(issue, english)).toBe(
      '7 items claim /about: Page "About us", Folder "About", Page 3, Page "Team", Page "Jobs", and 2 more (en)'
    );
    expect(describeIssue({ ...issue, locale: null }, english)).not.toContain("(");
  });

  it("explains a page segment, an invalid segment and a page held back by a clash", () => {
    const segment: TreeIssue = {
      fixable: true,
      item: page(4, "About us"),
      kind: "pageSegment",
      message: "",
      segments: [
        { expected: "ueber-uns", locale: "de", stored: null },
        { expected: "about-us", locale: "en", stored: "about" },
      ],
    };

    expect(describeIssue(segment, english)).toBe(
      'Page "About us" has no saved URL segment that matches its slug (de: saved none, slug ueber-uns; en: saved about, slug about-us)'
    );
    expect(describeIssue({ ...segment, fixable: false }, english)).toContain(
      "so it stays as it is"
    );
    expect(
      describeIssue(
        {
          fixable: true,
          fixedSegment: "about",
          item: page(4, "About"),
          kind: "invalidSegment",
          locale: "en",
          message: "",
          segment: "About",
        },
        english
      )
    ).toBe(
      'Page "About" has the segment "About", which is not valid. It will be saved as "about". (en)'
    );
    expect(
      describeIssue(
        {
          fixable: false,
          fixedSegment: null,
          item: page(5, "Hello"),
          kind: "invalidSegment",
          locale: null,
          message: "",
          segment: "Hello World",
        },
        german
      )
    ).toBe(
      'Seite "Hello" hat das Segment "Hello World", das ungültig ist, und das Neuerstellen kann kein anderes wählen.'
    );
  });

  it("explains a cycle, a missing parent and a reserved segment that stops the move", () => {
    const cycle: TreeIssue = {
      fixable: true,
      folders: [1, 2, 3],
      item: folder(1, "Blog"),
      kind: "folderCycle",
      message: "",
    };

    expect(describeIssue(cycle, english)).toBe(
      '3 folders are each other\'s parents. Folder "Blog" moves to the top level.'
    );
    expect(
      describeIssue({ ...cycle, fixable: false, reservedSegment: "admin" }, english)
    ).toContain("/admin is used by the site itself");
    expect(
      describeIssue(
        {
          fixable: true,
          item: folder(9, "Orphan"),
          kind: "folderParentMissing",
          message: "",
          parent: 99,
        },
        english
      )
    ).toBe('Folder "Orphan" sits in a folder that no longer exists and moves to the top level.');
  });

  it("names the folder of root pages and of order keys, or the top level", () => {
    const rootPages: TreeIssue = {
      count: 2,
      fixable: false,
      folder: 4,
      folderTitle: "Docs",
      items: [page(1, "One"), page(2, "Two")],
      kind: "multipleRootPages",
      message: "",
    };

    expect(describeIssue(rootPages, english)).toBe(
      '2 pages are the root page of folder "Docs": Page "One", Page "Two"'
    );
    expect(
      describeIssue({ ...rootPages, folder: null, folderTitle: undefined }, english)
    ).toContain("the top level");
    expect(
      describeIssue(
        {
          count: 3,
          fixable: true,
          items: [],
          kind: "orderKeyMissing",
          message: "",
          parent: null,
        },
        german
      )
    ).toBe("3 Einträge in der obersten Ebene haben keine Position");
    expect(
      describeIssue(
        {
          count: 3,
          fixable: true,
          items: [],
          kind: "orderKeyEqual",
          message: "",
          parent: 8,
          parentTitle: null,
        },
        english
      )
    ).toBe("3 items in folder 8 share a position with a sibling");
  });

  it("explains a stale draft, a dangling redirect and extra tree-lock rows", () => {
    expect(
      describeIssue(
        {
          fields: ["folder", "orderKey"],
          fixable: true,
          item: page(3, "Guide"),
          kind: "staleVersion",
          message: "",
        },
        english
      )
    ).toBe('The latest draft of Page "Guide" holds a different folder, position than the page');
    expect(
      describeIssue(
        {
          fixable: true,
          fromPath: "/old",
          id: 1,
          kind: "danglingRedirect",
          locale: "de",
          message: "",
          target: null,
        },
        english
      )
    ).toBe("The redirect from /old points at something that no longer exists (de)");
    expect(
      describeIssue(
        {
          expectedFrom: "/old/",
          expectedUrl: "/new/",
          fixable: true,
          from: "/old",
          id: 3,
          kind: "mirrorSlashForm",
          message: "",
          url: "/new",
        },
        english
      )
    ).toBe("The redirect from /old is in the other URL form and is rewritten to /old/");
    expect(
      describeIssue(
        {
          expectedFrom: "/old/",
          expectedUrl: "/new/",
          fixable: true,
          from: "/old",
          id: 3,
          kind: "mirrorSlashForm",
          message: "",
          url: "/new",
        },
        german
      )
    ).toBe("Die Weiterleitung von /old hat die andere URL-Form und wird zu /old/ umgeschrieben");
    expect(
      describeIssue(
        {
          expectedFrom: "/feed.xml",
          expectedUrl: "/new/",
          fixable: true,
          from: "/feed.xml",
          id: 4,
          kind: "mirrorSlashForm",
          message: "",
          url: "/new",
        },
        english
      )
    ).toBe(
      "The redirect from /feed.xml points at /new, in the other URL form, and is rewritten to point at /new/"
    );
    expect(
      describeIssue({ fixable: false, ids: [1, 2], kind: "treeStateRows", message: "" }, english)
    ).toBe("The tree lock has 2 rows where it needs one. Delete the extra rows by hand.");
  });

  it("has every string in both languages", () => {
    // `translateWith` throws for a key a table lacks, so each line below proves both tables hold it.
    const issues: TreeIssue[] = [
      {
        fixable: true,
        fullPath: [],
        item: folder(1, "A"),
        kind: "folderPath",
        message: "",
        path: "/a",
      },
      {
        fixable: false,
        folders: [1],
        item: folder(1, "A"),
        kind: "folderCycle",
        message: "",
        reservedSegment: "api",
      },
      {
        fixable: false,
        item: folder(1, "A"),
        kind: "folderParentMissing",
        message: "",
        parent: 2,
        reservedSegment: "api",
      },
      { fixable: false, item: folder(1, "A"), kind: "folderSlugMissing", message: "" },
    ];

    for (const issue of issues) {
      expect(describeIssue(issue, german)).not.toBe("");
      expect(describeIssue(issue, english)).not.toBe(describeIssue(issue, german));
    }
  });
});
