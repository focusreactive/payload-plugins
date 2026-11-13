import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

/**
 * With the folders MCP tools on, the refusal of the stock `updateDocument` names them
 * (`mcp-guard.int.test.ts`). When the `mcp` option or one tool is off, the model must not be sent
 * to a tool that does not exist, so the text stays the one that names the admin and the REST routes.
 */

const harnesses: TestPayload[] = [];

const boot = async (options: Parameters<typeof getTestPayload>[0]) => {
  const harness = await getTestPayload(options);
  harnesses.push(harness);

  return harness;
};

afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    await clearTree(harness.payload);
    await harness.destroy();
  }
});

const refusedMovePage = async (harness: TestPayload) => {
  const products = await createFolder(harness.payload, { slug: "products" });
  const guides = await createFolder(harness.payload, { slug: "guides" });
  const page = await createPage(harness.payload, { folder: products.id, slug: "gift-cards" });

  return callMcpTool(harness, "updateDocument", {
    data: { folder: guides.id },
    id: page.id,
    slug: "pages",
  });
};

const refusedRenameFolder = async (harness: TestPayload) => {
  const company = await createFolder(harness.payload, { slug: "company" });

  return callMcpTool(harness, "updateDocument", {
    data: { slug: "team" },
    id: company.id,
    slug: "folders",
  });
};

describe("the refusal of a structure change when the folders MCP tools are not all on", () => {
  it("keeps the text that names the admin and REST with mcp: false", async () => {
    const harness = await boot({ foldersOptions: { mcp: false }, mcp: true });

    const move = await refusedMovePage(harness);
    const rename = await refusedRenameFolder(harness);

    for (const refusal of [move, rename]) {
      expect(refusal.isError).toBe(true);
      expect(refusal.text).not.toContain("previewMove");
      expect(refusal.text).not.toContain("previewRename");
      expect(refusal.text).not.toContain("applyTreeChange");
      expect(refusal.text).toContain("Nothing was saved.");
    }
    expect(move.text).toContain("POST /api/folders-tree/move");
    expect(rename.text).toContain("POST /api/folders-tree/folders/:id/preview");
  });

  it("falls back for a move when previewMove is off, and still names the rename tools", async () => {
    const harness = await boot({
      foldersOptions: { mcp: { tools: { previewMove: false } } },
      mcp: true,
    });

    const move = await refusedMovePage(harness);
    const rename = await refusedRenameFolder(harness);

    expect(move.text).toContain("POST /api/folders-tree/move");
    expect(move.text).not.toContain("applyTreeChange");
    expect(rename.text).toContain("previewRename");
    expect(rename.text).toContain("applyTreeChange");
  });

  it("falls back for a rename when previewRename is off, and still names the move tools", async () => {
    const harness = await boot({
      foldersOptions: { mcp: { tools: { previewRename: false } } },
      mcp: true,
    });

    const move = await refusedMovePage(harness);
    const rename = await refusedRenameFolder(harness);

    expect(move.text).toContain("previewMove");
    expect(move.text).toContain("applyTreeChange");
    expect(rename.text).toContain("POST /api/folders-tree/folders/:id/preview");
    expect(rename.text).not.toContain("previewRename");
  });

  it("falls back for both when applyTreeChange is off", async () => {
    const harness = await boot({
      foldersOptions: { mcp: { tools: { applyTreeChange: false } } },
      mcp: true,
    });

    const move = await refusedMovePage(harness);
    const rename = await refusedRenameFolder(harness);

    expect(move.text).not.toContain("previewMove");
    expect(rename.text).not.toContain("previewRename");
  });
});
