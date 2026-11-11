import type { Payload } from "payload";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MovePreview } from "../../src/core/move.js";
import { callEndpoint } from "../helpers/callEndpoint.js";
import { seedCompanyTree } from "../helpers/companyTree.js";
import type { CompanyTree } from "../helpers/companyTree.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool, listMcpTools } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder } from "../helpers/treeFixtures.js";

type Option = {
  confirmationToken: string;
  draftOnlyPages: number;
  examples: Array<{ from: string; locale: string; to: string }>;
  needsConfirmation: boolean;
  publishedUrlChanges: { byLocale: Record<string, number>; total: number };
  redirects: { enabled: boolean; redirectsPluginRows: number; rowsToWrite: number };
  summary: string;
};

type RenamePreview = {
  alsoChangeUrl?: Option & {
    blocked?: Array<{ message: string }>;
    ok?: boolean;
    slug: Record<string, string>;
  };
  askUser: string[];
  asked: Option;
  folder: {
    fallingBack: string[];
    fullPath: Record<string, string>;
    id: number;
    name: Record<string, string>;
    slug: Record<string, string>;
  };
  ok: true;
};

const drafter = { email: "mcp-rename-drafter@example.com", password: "test-password" };

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ mcp: true });
  await harness.payload.create({
    collection: "users",
    data: { ...drafter, role: "drafter" } as never,
    overrideAccess: true,
  });
});

afterAll(async () => {
  await harness?.destroy();
});

afterEach(async () => {
  await harness.payload.db.deleteMany({
    collection: "folder-redirects",
    where: { id: { exists: true } },
  });
  await clearTree(harness.payload);
});

const preview = (toolArguments: Record<string, unknown>, user?: typeof drafter) =>
  callMcpTool(harness, "previewRename", toolArguments, user);

const previewOk = async (toolArguments: Record<string, unknown>) => {
  const result = await preview(toolArguments);
  expect(result.isError).toBe(false);

  return result.structuredContent as RenamePreview;
};

const createLivePage = (payload: Payload, folder: number, slug: string) =>
  payload.create({
    collection: "pages",
    data: { _status: "published", folder, slug, title: slug } as never,
    depth: 0,
    overrideAccess: true,
  });

describe("previewRename for the Company to Team rename", () => {
  it("offers the label alone and the URL too, with the costs and the German side", async () => {
    const tree: CompanyTree = await seedCompanyTree(harness.payload);

    const result = await previewOk({ folder: tree.company.id, name: { en: "Team" } });

    expect(result.folder).toEqual({
      fallingBack: [],
      fullPath: { de: "/unternehmen", en: "/company" },
      id: tree.company.id,
      name: { de: "Unternehmen", en: "Company" },
      slug: { de: "unternehmen", en: "company" },
    });
    expect(result.asked).toMatchObject({
      draftOnlyPages: 0,
      needsConfirmation: false,
      publishedUrlChanges: { byLocale: {}, total: 0 },
      summary: "Only the English name becomes Team. No URL changes.",
    });
    expect(result.asked.confirmationToken).toEqual(expect.any(String));

    const also = result.alsoChangeUrl as NonNullable<RenamePreview["alsoChangeUrl"]>;
    expect(also.slug).toEqual({ en: "team" });
    expect(also.needsConfirmation).toBe(true);
    expect(also.publishedUrlChanges).toEqual({ byLocale: { en: 3 }, total: 3 });
    expect(also.redirects).toEqual({ enabled: true, redirectsPluginRows: 0, rowsToWrite: 1 });
    expect(also.summary).toBe(
      "The English name becomes Team and the English URL segment becomes team. 3 published URLs will change in English. The old URLs will redirect to the new ones."
    );
    expect(also.examples).toEqual([
      { from: "/company/about-us", locale: "en", to: "/team/about-us" },
      { from: "/company/contact", locale: "en", to: "/team/contact" },
      { from: "/company/our-team", locale: "en", to: "/team/our-team" },
    ]);
    expect(also.confirmationToken).not.toBe(result.asked.confirmationToken);

    expect(result.askUser).toHaveLength(2);
    expect(result.askUser[0]).toContain("/company becomes /team");
    expect(result.askUser[0]).toContain("3 live URLs in English");
    expect(result.askUser[1]).toBe(
      "The German name stays Unternehmen and the German URLs stay /unternehmen. Rename those too?"
    );
  });

  it("shows both options and both tokens in the text the model reads", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await preview({ folder: tree.company.id, name: { en: "Team" } });
    const structured = result.structuredContent as RenamePreview;

    expect(result.text).toContain(structured.asked.confirmationToken);
    expect(result.text).toContain(structured.alsoChangeUrl?.confirmationToken);
    expect(result.text).toContain("3 published URLs will change in English");
  });

  it("offers no URL option when the name makes the same slug", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await previewOk({ folder: tree.company.id, name: { en: "COMPANY" } });

    expect(result.alsoChangeUrl).toBeUndefined();
    expect(result.asked.summary).toBe("Only the English name becomes COMPANY. No URL changes.");
  });

  it("says nothing changes, with no token, for a name and slug the folder has", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await preview({
      folder: tree.company.id,
      name: { en: "Company" },
      slug: { en: "company" },
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual({ nothingToChange: true, ok: true });
    expect(result.text).toContain("Nothing to change");
  });
});

describe("previewRename plans several languages as one edit", () => {
  it("counts an English and a German slug change together", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await previewOk({
      folder: tree.company.id,
      slug: { de: "team", en: "team" },
    });

    expect(result.alsoChangeUrl).toBeUndefined();
    expect(result.asked.publishedUrlChanges).toEqual({ byLocale: { de: 3, en: 3 }, total: 6 });
    expect(result.asked.redirects.rowsToWrite).toBe(2);
    expect(result.asked.summary).toContain("6 published URLs will change across 2 languages.");
    expect(result.asked.examples.map(({ from, locale, to }) => `${locale} ${from} ${to}`)).toEqual([
      "en /company/about-us /team/about-us",
      "en /company/contact /team/contact",
      "en /company/our-team /team/our-team",
      "de /unternehmen/kontakt /team/kontakt",
      "de /unternehmen/ueber-uns /team/ueber-uns",
      "de /unternehmen/unser-team /team/unser-team",
    ]);
  });

  it("moves a language that falls back to the English slug along with it", async () => {
    const { payload } = harness;
    const guides = (await payload.create({
      collection: "folders",
      data: { name: "Guides", slug: "guides" },
      depth: 0,
      overrideAccess: true,
    })) as unknown as { id: number };
    await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        folder: guides.id,
        slug: { de: "start", en: "start" },
        title: { de: "Start", en: "Start" },
      } as never,
      depth: 0,
      locale: "all",
      overrideAccess: true,
    });

    const result = await previewOk({ folder: guides.id, slug: { en: "manuals" } });

    expect(result.folder.fallingBack).toEqual(["de"]);
    expect(result.asked.publishedUrlChanges).toEqual({ byLocale: { de: 1, en: 1 }, total: 2 });
    expect(result.asked.examples).toEqual([
      { from: "/guides/start", locale: "en", to: "/manuals/start" },
      { from: "/guides/start", locale: "de", to: "/manuals/start" },
    ]);
  });
});

describe("previewRename refuses what a save would refuse", () => {
  it("blocks a path another folder has, with no token", async () => {
    const tree = await seedCompanyTree(harness.payload);
    await createFolder(harness.payload, { name: "Team", slug: "team" });

    const result = await preview({ folder: tree.company.id, slug: { en: "team" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("/team is already used by another folder");
    expect(result.text).toContain("no confirmation token was issued");
    expect(result.structuredContent).toMatchObject({
      blocked: [{ locale: "en", reason: "conflict" }],
      ok: false,
    });
    expect(result.structuredContent).not.toHaveProperty("asked");
  });

  it("blocks the URL option and still offers the label alone when the new name's slug is taken", async () => {
    const tree = await seedCompanyTree(harness.payload);
    await createFolder(harness.payload, { name: "Team", slug: "team" });

    const result = await previewOk({ folder: tree.company.id, name: { en: "Team" } });

    expect(result.asked.needsConfirmation).toBe(false);
    expect(result.alsoChangeUrl).toMatchObject({ ok: false, slug: { en: "team" } });
    expect(result.alsoChangeUrl?.blocked?.[0].message).toContain("/team is already used");
    expect(result.alsoChangeUrl).not.toHaveProperty("confirmationToken");
    expect(result.askUser.join("\n")).toContain("The URL cannot follow the new name");
  });

  it("refuses a user without publish rights for the pages beneath, as the REST preview does", async () => {
    const tree = await seedCompanyTree(harness.payload);
    const body = { locale: "en", slug: "team" };

    const rest = await callEndpoint<MovePreview>({
      body,
      config: harness.config,
      method: "POST",
      path: `/folders-tree/folders/${tree.company.id}/preview`,
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
      user: drafter,
    });
    const result = await preview({ folder: tree.company.id, slug: { en: "team" } }, drafter);

    expect(rest.body.blocked).toMatchObject([{ reason: "forbidden" }]);
    expect(result.isError).toBe(true);
    expect(result.text).toContain(rest.body.blocked[0].message);
    expect(result.structuredContent).not.toHaveProperty("asked");
  });

  it("lets the same user preview a name change, which moves no URL", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await preview({ folder: tree.company.id, name: { en: "Team" } }, drafter);

    expect(result.isError).toBe(false);
    expect((result.structuredContent as RenamePreview).asked.needsConfirmation).toBe(false);
  });

  it("refuses a parent change and points to previewMove", async () => {
    const tree = await seedCompanyTree(harness.payload);
    const other = await createFolder(harness.payload, { slug: "other" });

    const result = await preview({
      folder: tree.company.id,
      parent: other.id,
      slug: { en: "team" },
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Use previewMove");
  });

  it("says a missing folder was not found", async () => {
    const result = await preview({ folder: 987_654, name: { en: "Team" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("was not found");
  });

  it("refuses a language the site does not have, through the tool's input schema", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await preview({ folder: tree.company.id, name: { fr: "Equipe" } });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("must NOT have additional properties");
  });

  it("asks for a name or a slug", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const result = await preview({ folder: tree.company.id });

    expect(result.isError).toBe(true);
    expect(result.text).toContain("Pass name, slug or both");
  });
});

describe("the REST preview of a folder edit still answers as before", () => {
  it("returns the same counts and samples for a single-locale slug", async () => {
    const tree = await seedCompanyTree(harness.payload);

    const { body, status } = await callEndpoint<MovePreview>({
      body: { locale: "en", slug: "team" },
      config: harness.config,
      method: "POST",
      path: `/folders-tree/folders/${tree.company.id}/preview`,
      payload: harness.payload,
      payloadInstanceCacheKey: harness.cacheKey,
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({
      blocked: [],
      foldersRewritten: 1,
      ok: true,
      redirectRowsToWrite: 1,
      urlChanges: { draftOnly: 0, published: 3, publishedAcrossLocales: 3 },
    });
    expect(body.samples).toHaveLength(3);
    expect(body.samples.map((sample) => sample.to).sort()).toEqual([
      "/team/about-us",
      "/team/contact",
      "/team/our-team",
    ]);
  });

  it("counts a draft-only rename without asking for confirmation", async () => {
    const { payload } = harness;
    const folder = await createFolder(payload, { slug: "drafts" });
    await payload.create({
      collection: "pages",
      data: { _status: "draft", folder: folder.id, slug: "later", title: "Later" } as never,
      depth: 0,
      draft: true,
      overrideAccess: true,
    });
    await createLivePage(payload, (await createFolder(payload, { slug: "elsewhere" })).id, "live");

    const result = await previewOk({ folder: folder.id, slug: { en: "ideas" } });

    expect(result.asked.needsConfirmation).toBe(false);
    expect(result.asked.draftOnlyPages).toBe(1);
    expect(result.asked.summary).toContain("No published URL will change.");
  });
});

describe("previewRename as a tool", () => {
  it("tells the model what rename means and where it ends", async () => {
    const tool = (await listMcpTools(harness)).find(({ name }) => name === "previewRename");

    expect(tool?.description).toContain("applyTreeChange");
    expect(tool?.description).toContain("previewMove");
    expect(tool?.description).toContain("alsoChangeUrl");
    expect(tool?.description).not.toMatch(/[–—]/u);
    const schema = tool?.inputSchema as { properties: Record<string, unknown>; required: string[] };
    expect(Object.keys(schema.properties).sort()).toEqual([
      "folder",
      "name",
      "parent",
      "redirects",
      "slug",
    ]);
    expect(schema.required).toEqual(["folder"]);
  });
});
