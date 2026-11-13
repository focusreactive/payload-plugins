import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { stepOperation } from "../../src/core/operations.js";
import {
  issueConfirmationToken,
  setConfirmationTokenClock,
} from "../../src/mcp/confirmationToken.js";
import { setMirrorStepBudgetMs } from "../../src/mcp/stepMirror.js";
import { seedCompanyTree } from "../helpers/companyTree.js";
import type { CompanyTree } from "../helpers/companyTree.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";
import { createTestRequest } from "../helpers/treeFixtures.js";

type Option = { confirmationToken: string; needsConfirmation: boolean; summary: string };

type RenamePreview = { alsoChangeUrl?: Option; asked: Option };

type Applied = {
  done: boolean;
  folder: {
    fullPath: Record<string, string | null>;
    id: number;
    name: Record<string, string | null>;
    slug: Record<string, string | null>;
  };
  mirrorBatch?: { done: number; operationId: number; status: string; total: number };
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsWritten: number };
};

const otherEditor = { email: "mcp-rename-editor@example.com", password: "test-password" };

let harness: TestPayload;
let mirrorHarness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
  mirrorHarness = await getTestPayload({
    foldersOptions: {
      limits: { maxSyncDocuments: 1 },
      redirects: { mirrorToRedirectsPlugin: true },
    },
    mcp: true,
  });
  await harness.payload.create({
    collection: "users",
    data: { ...otherEditor, role: "editor" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
  await mirrorHarness?.destroy();
});

afterEach(async () => {
  for (const { payload } of [harness, mirrorHarness]) {
    for (const collection of ["redirects", "folder-redirects", "folder-operations"] as const) {
      await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
    }
    await clearTree(payload);
  }
});

const previewRename = async (
  target: TestPayload,
  toolArguments: Record<string, unknown>
): Promise<RenamePreview> => {
  const result = await callMcpTool(target, "previewRename", toolArguments);
  expect(result.isError).toBe(false);

  return result.structuredContent as RenamePreview;
};

const apply = (
  target: TestPayload,
  toolArguments: Record<string, unknown>,
  user?: typeof otherEditor
) => callMcpTool(target, "applyTreeChange", toolArguments, user);

const confirmed = (option: Option) => ({
  confirmationToken: option.confirmationToken,
  confirmedSummary: option.summary,
});

type FolderState = {
  fullPath: Record<string, string>;
  name: Record<string, string>;
  slug: Record<string, string>;
};

const readFolder = async (payload: Payload, id: number): Promise<FolderState> =>
  (await payload.db.findOne({
    collection: "folders",
    locale: "all",
    where: { id: { equals: id } },
  })) as unknown as FolderState;

const readPagePath = async (payload: Payload, id: number, locale: "de" | "en") =>
  (
    (await payload.findByID({
      collection: "pages",
      depth: 0,
      id,
      locale,
      overrideAccess: true,
    })) as unknown as { fullPath: string }
  ).fullPath;

const countRows = async (payload: Payload, collection: "folder-redirects" | "redirects") =>
  (await payload.count({ collection, overrideAccess: true })).totalDocs;

const expectCompanyUntouched = async (payload: Payload, tree: CompanyTree) => {
  const company = await readFolder(payload, tree.company.id);
  expect(company.slug).toEqual({ de: "unternehmen", en: "company" });
  expect(company.name).toEqual({ de: "Unternehmen", en: "Company" });
  expect(await readPagePath(payload, tree.contact.id, "en")).toBe("/company/contact");
  expect(await countRows(payload, "folder-redirects")).toBe(0);
};

describe("applyTreeChange for a previewed URL rename", () => {
  it("changes the English URLs of the three pages, writes the redirect and reads the new paths back", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, name: { en: "Team" } });

    const result = await apply(harness, confirmed(preview.alsoChangeUrl as Option));

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.done).toBe(true);
    expect(applied.folder).toEqual({
      fullPath: { de: "/unternehmen", en: "/team" },
      id: tree.company.id,
      name: { de: "Unternehmen", en: "Team" },
      slug: { de: "unternehmen", en: "team" },
    });
    expect(applied.publishedUrlChanges).toEqual({ byLocale: { en: 3 }, total: 3 });
    expect(applied.redirects).toEqual({ enabled: true, redirectsPluginRows: 0, rowsWritten: 1 });
    expect(applied.mirrorBatch).toBeUndefined();
    expect(result.text).toContain("en /team");
    expect(result.text).toContain("de /unternehmen");

    for (const page of [tree.aboutUs, tree.contact, tree.ourTeam]) {
      expect(await readPagePath(payload, page.id, "en")).toMatch(/^\/team\//u);
      expect(await readPagePath(payload, page.id, "de")).toMatch(/^\/unternehmen\//u);
    }
    expect(await countRows(payload, "folder-redirects")).toBe(1);
    const stored = await readFolder(payload, tree.company.id);
    expect(stored.name).toEqual({ de: "Unternehmen", en: "Team" });
    expect(stored.slug).toEqual({ de: "unternehmen", en: "team" });
  });

  it("renames English and German together in one write", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, {
      folder: tree.company.id,
      slug: { de: "gruppe", en: "team" },
    });

    const result = await apply(harness, confirmed(preview.asked));

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.folder.fullPath).toEqual({ de: "/gruppe", en: "/team" });
    expect(applied.publishedUrlChanges).toEqual({ byLocale: { de: 3, en: 3 }, total: 6 });
    expect(await readPagePath(payload, tree.contact.id, "de")).toBe("/gruppe/kontakt");
    expect(await readPagePath(payload, tree.contact.id, "en")).toBe("/team/contact");
    expect(await countRows(payload, "folder-redirects")).toBe(2);
  });

  it("writes no redirect when the preview was asked for none", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, {
      folder: tree.company.id,
      redirects: false,
      slug: { en: "team" },
    });
    expect(preview.asked.summary).toContain("The old URLs will not redirect to the new ones.");

    const result = await apply(harness, confirmed(preview.asked));

    expect(result.isError).toBe(false);
    expect((result.structuredContent as Applied).redirects.rowsWritten).toBe(0);
    expect(await readPagePath(payload, tree.contact.id, "en")).toBe("/team/contact");
    expect(await countRows(payload, "folder-redirects")).toBe(0);
  });

  it("leaves the request's locale and context as they were for the next call", async () => {
    const tree = await seedCompanyTree(harness.payload);
    const preview = await previewRename(harness, { folder: tree.company.id, slug: { en: "team" } });
    await apply(harness, confirmed(preview.asked));

    const stock = await callMcpTool(harness, "updateDocument", {
      data: { slug: "squad" },
      id: tree.company.id,
      slug: "folders",
    });

    expect(stock.isError).toBe(true);
    expect(stock.text).toContain('"slug" cannot be changed through MCP updateDocument');
    expect((await readFolder(harness.payload, tree.company.id)).slug.en).toBe("team");
  });
});

describe("applyTreeChange for a previewed name change", () => {
  it("changes the name and no URL with the token alone", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, name: { en: "Team" } });
    expect(preview.asked.needsConfirmation).toBe(false);

    const result = await apply(harness, { confirmationToken: preview.asked.confirmationToken });

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.folder.name).toEqual({ de: "Unternehmen", en: "Team" });
    expect(applied.folder.fullPath).toEqual({ de: "/unternehmen", en: "/company" });
    expect(applied.publishedUrlChanges).toEqual({ byLocale: {}, total: 0 });
    expect(applied.redirects.rowsWritten).toBe(0);
    const stored = await readFolder(payload, tree.company.id);
    expect(stored.name).toEqual({ de: "Unternehmen", en: "Team" });
    expect(stored.slug).toEqual({ de: "unternehmen", en: "company" });
    expect(await readPagePath(payload, tree.contact.id, "en")).toBe("/company/contact");
    expect(await countRows(payload, "folder-redirects")).toBe(0);
  });

  it("gives a language its own name without touching the folder's other languages or slugs", async () => {
    const { payload } = harness;
    const folder = (await payload.create({
      collection: "folders",
      data: { name: "Guides", slug: "guides" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const preview = await previewRename(harness, { folder: folder.id, name: { de: "Ratgeber" } });

    const result = await apply(harness, { confirmationToken: preview.asked.confirmationToken });

    expect(result.isError).toBe(false);
    const stored = await readFolder(payload, folder.id);
    expect(stored.name).toEqual({ de: "Ratgeber", en: "Guides" });
    expect(stored.slug.en).toBe("guides");
    expect(stored.slug.de).toBeNull();
    expect(stored.fullPath).toEqual({ de: "/guides", en: "/guides" });
  });
});

describe("applyTreeChange keeps a language that falls back to the default slug following it", () => {
  it("moves a German folder with its own name but no slug of its own along with the English slug", async () => {
    const { payload } = harness;
    const folder = (await payload.create({
      collection: "folders",
      data: { name: "Guides", slug: "guides" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    const namePreview = await previewRename(harness, {
      folder: folder.id,
      name: { de: "Ratgeber" },
    });
    expect(
      (await apply(harness, { confirmationToken: namePreview.asked.confirmationToken })).isError
    ).toBe(false);
    await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: folder.id,
        slug: { de: "start", en: "start" },
        title: { de: "Start", en: "Start" },
      } as never,
      depth: 0,
      locale: "all" as never,
      overrideAccess: true,
    });
    const preview = await previewRename(harness, { folder: folder.id, slug: { en: "manuals" } });

    const result = await apply(harness, confirmed(preview.asked));

    expect(result.isError).toBe(false);
    const stored = await readFolder(payload, folder.id);
    expect(stored.slug.en).toBe("manuals");
    expect(stored.slug.de).toBeNull();
    expect(stored.name).toEqual({ de: "Ratgeber", en: "Guides" });
    expect(stored.fullPath).toEqual({ de: "/manuals", en: "/manuals" });
    expect((result.structuredContent as Applied).publishedUrlChanges.byLocale).toEqual({
      de: 1,
      en: 1,
    });
  });
});

describe("applyTreeChange refuses a rename before it writes", () => {
  it("refuses a confirmedSummary that is not the preview's, or is missing", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, name: { en: "Team" } });
    const token = (preview.alsoChangeUrl as Option).confirmationToken;

    const wrong = await apply(harness, {
      confirmationToken: token,
      confirmedSummary: "3 published URLs will change.",
    });
    const missing = await apply(harness, { confirmationToken: token });

    for (const refused of [wrong, missing]) {
      expect(refused.isError).toBe(true);
      expect(refused.text).toContain("confirmedSummary");
      expect(refused.text).toContain("previewRename");
      expect(refused.text).toContain("word for word");
    }
    await expectCompanyUntouched(payload, tree);
  });

  it("refuses a token another user previewed", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, slug: { en: "team" } });

    const result = await apply(harness, confirmed(preview.asked), otherEditor);

    expect(result.isError).toBe(true);
    expect(result.text).toContain("another user");
    await expectCompanyUntouched(payload, tree);
  });

  it("refuses a token that was used already, for a URL rename and for a name change", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const urlPreview = await previewRename(harness, {
      folder: tree.company.id,
      slug: { en: "team" },
    });
    expect((await apply(harness, confirmed(urlPreview.asked))).isError).toBe(false);

    const urlReplay = await apply(harness, confirmed(urlPreview.asked));

    expect(urlReplay.isError).toBe(true);
    expect(urlReplay.text).toContain("The tree changed since the preview. Preview again");
    expect(await countRows(payload, "folder-redirects")).toBe(1);

    const namePreview = await previewRename(harness, {
      folder: tree.company.id,
      name: { en: "Squad" },
    });
    const nameToken = { confirmationToken: namePreview.asked.confirmationToken };
    expect((await apply(harness, nameToken)).isError).toBe(false);

    const nameReplay = await apply(harness, nameToken);

    expect(nameReplay.isError).toBe(true);
    expect(nameReplay.text).toContain("The tree changed since the preview. Preview again");
  });

  it("refuses when the folder was renamed elsewhere after the preview", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, name: { en: "Team" } });
    await payload.update({
      collection: "folders",
      data: { name: "Firm" },
      id: tree.company.id,
      locale: "en",
      overrideAccess: true,
    });

    const nameOnly = await apply(harness, {
      confirmationToken: preview.asked.confirmationToken,
    });
    const withUrl = await apply(harness, confirmed(preview.alsoChangeUrl as Option));

    for (const refused of [nameOnly, withUrl]) {
      expect(refused.isError).toBe(true);
      expect(refused.text).toContain("The tree changed since the preview. Preview again");
    }
    expect((await readFolder(payload, tree.company.id)).name.en).toBe("Firm");
    expect(await readPagePath(payload, tree.contact.id, "en")).toBe("/company/contact");
  });

  it("refuses when the URLs the rename changes are not the ones previewed, and says what they are now", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, slug: { en: "team" } });
    await payload.create({
      collection: "pages",
      data: { _status: "published", folder: tree.company.id, slug: "extra", title: "Extra" },
      depth: 0,
      overrideAccess: true,
    });

    const result = await apply(harness, confirmed(preview.asked));

    expect(result.isError).toBe(true);
    expect(result.text).toContain(
      "The tree changed since the preview. Preview again and confirm with the user."
    );
    expect(result.text).toContain("published URLs will change");
    expect(result.text).not.toContain(preview.asked.summary);
    await expectCompanyUntouched(payload, tree);
  });

  it("refuses when the new URL was taken after the preview", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, slug: { en: "team" } });
    await payload.create({
      collection: "folders",
      data: { name: "Team", slug: "team" },
      depth: 0,
      overrideAccess: true,
    });

    const result = await apply(harness, confirmed(preview.asked));

    expect(result.isError).toBe(true);
    expect(result.text).toContain("/team is already used by another folder");
    expect((await readFolder(payload, tree.company.id)).slug.en).toBe("company");
  });

  it("refuses an expired token, with the clock moved instead of waiting", async () => {
    const { payload } = harness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(harness, { folder: tree.company.id, slug: { en: "team" } });
    const realClock = setConfirmationTokenClock(() => Date.now() + 16 * 60 * 1000);
    try {
      const result = await apply(harness, confirmed(preview.asked));

      expect(result.isError).toBe(true);
      expect(result.text).toContain("expired");
    } finally {
      setConfirmationTokenClock(realClock);
    }
    await expectCompanyUntouched(payload, tree);
  });

  it("refuses a token that does not hold a rename this tool knows", async () => {
    const { payload } = harness;
    const [admin] = (await payload.find({ collection: "users", limit: 1, overrideAccess: true }))
      .docs;
    const token = issueConfirmationToken({
      digest: "digest",
      kind: "rename",
      request: { folder: 1 },
      secret: payload.secret,
      user: { collection: "users", id: admin.id },
    });

    const result = await apply(harness, { confirmationToken: token });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("does not hold a rename");
  });
});

describe("the stock updateDocument still refuses a folder slug change", () => {
  it("refuses it, and says which tools to use once the folders tools are on", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await callMcpTool(harness, "updateDocument", {
      data: { slug: "team" },
      id: tree.company.id,
      slug: "folders",
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('"slug" cannot be changed through MCP updateDocument');
    expect((await readFolder(harness.payload, tree.company.id)).slug.en).toBe("company");
  });
});

describe("applyTreeChange for a rename and the redirects plugin's batch", () => {
  it("steps the batch itself and reports it done with its operation id", async () => {
    const { payload } = mirrorHarness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(mirrorHarness, {
      folder: tree.company.id,
      slug: { en: "team" },
    });

    const result = await apply(mirrorHarness, confirmed(preview.asked));

    expect(result.isError).toBe(false);
    const applied = result.structuredContent as Applied;
    expect(applied.redirects.redirectsPluginRows).toBe(3);
    expect(applied.mirrorBatch).toMatchObject({ done: 3, status: "done", total: 3 });
    expect(applied.mirrorBatch?.operationId).toEqual(expect.any(Number));
    expect(await countRows(payload, "redirects")).toBe(3);
  });

  it("reports what is left, with its operation id, when the time runs out", async () => {
    const { payload } = mirrorHarness;
    const tree = await seedCompanyTree(payload);
    const preview = await previewRename(mirrorHarness, {
      folder: tree.company.id,
      slug: { en: "team" },
    });
    const previousBudget = setMirrorStepBudgetMs(0);
    let result: Awaited<ReturnType<typeof apply>>;
    try {
      result = await apply(mirrorHarness, confirmed(preview.asked));
    } finally {
      setMirrorStepBudgetMs(previousBudget);
    }

    expect(result.isError).toBe(false);
    const { mirrorBatch } = result.structuredContent as Applied;
    expect(mirrorBatch).toMatchObject({ done: 0, status: "running", total: 3 });
    expect(result.text).toContain(`operation ${mirrorBatch?.operationId}`);
    expect(await countRows(payload, "redirects")).toBe(0);

    const admin = await createTestRequest(payload);
    const [user] = (await payload.find({ collection: "users", limit: 1, overrideAccess: true }))
      .docs;
    admin.user = { ...user, collection: "users" } as never;
    const progress = await stepOperation(admin, mirrorBatch?.operationId as number);
    expect(progress.status).toBe("done");
    expect(await countRows(payload, "redirects")).toBe(3);
  });
});
