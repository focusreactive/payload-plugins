import { afterEach, describe, expect, it } from "vitest";

import { mcpPluginOptions } from "../../dev/mcpPluginOptions.js";
import { foldersMcpInstructions } from "../../src/mcp/instructions.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool, listMcpTools, readMcpInstructions } from "../helpers/mcpClient.js";

const harnesses: TestPayload[] = [];

const boot = async (options: Parameters<typeof getTestPayload>[0]) => {
  const harness = await getTestPayload(options);
  harnesses.push(harness);

  return harness;
};

afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    await harness.destroy();
  }
});

const descriptionOf = async (harness: TestPayload, name: string) =>
  (await listMcpTools(harness)).find((tool) => tool.name === name)?.description ?? "";

describe("the stock tool descriptions", () => {
  it("tell the model what a folder is and where structure changes go", async () => {
    const harness = await boot({ mcp: true });

    const update = await descriptionOf(harness, "updateDocument");
    const create = await descriptionOf(harness, "createDocuments");
    const find = await descriptionOf(harness, "findDocuments");

    expect(update).toContain("pages sit in folders and folders sit in folders");
    expect(update).toContain("previewMove and applyTreeChange");
    expect(update).toContain("previewRename and applyTreeChange");
    expect(update).toContain("draft argument defaults to false");
    expect(update).toContain("locale all");
    expect(create).toContain("createFolder");
    expect(create).toContain("locale all");
    expect(find).toContain("Pass locale all to get every language");
    expect(find).toContain("browseTree");
    for (const text of [update, create, find]) {
      expect(text).not.toMatch(/[–—]/u);
    }
  });

  it("are on every collection, so the first one plugin-mcp meets does not decide", async () => {
    const harness = await boot({ mcp: true, mcpOptions: "none" });

    expect(await descriptionOf(harness, "updateDocument")).toContain("previewMove");
    expect(await descriptionOf(harness, "findDocuments")).toContain("locale all");
  });

  it("do not name a tool the host switched off", async () => {
    const harness = await boot({
      foldersOptions: { mcp: { tools: { previewRename: false } } },
      mcp: true,
    });

    const update = await descriptionOf(harness, "updateDocument");

    expect(update).toContain("previewMove and applyTreeChange");
    expect(update).not.toContain("previewRename");
    expect(update).toContain("A folder's slug cannot be changed with this tool.");
  });

  it("keep the host's own description, whichever collection it sits on", async () => {
    const base = mcpPluginOptions();
    const baseCollections = base.collections as unknown as Record<
      string,
      { tools: Record<string, unknown> }
    >;
    const harness = await boot({
      mcp: true,
      mcpOptions: {
        ...base,
        collections: {
          ...base.collections,
          posts: {
            tools: {
              ...baseCollections.posts.tools,
              update: { description: "The host's own update text." },
            },
          },
        } as never,
      },
    });

    expect(await descriptionOf(harness, "updateDocument")).toBe("The host's own update text.");
    expect(await descriptionOf(harness, "findDocuments")).toContain("locale all");
  });

  it("are left alone when the mcp option is false", async () => {
    const harness = await boot({ foldersOptions: { mcp: false }, mcp: true });

    expect(await descriptionOf(harness, "updateDocument")).not.toContain("previewMove");
  });
});

describe("the plugin's own collections and global", () => {
  const stockToolCalls: Array<[string, Record<string, unknown>]> = [
    ["countDocuments", {}],
    ["createDocuments", { documents: [{ data: {} }] }],
    ["deleteDocuments", { id: 1 }],
    ["findDistinct", { field: "id" }],
    ["findDocuments", {}],
    ["getCollectionSchema", {}],
    ["updateDocument", { data: {}, id: 1 }],
  ];

  it("have no stock tools when the host set none", async () => {
    const harness = await boot({ mcp: true, mcpOptions: "none" });

    for (const slug of ["folder-redirects", "folder-operations"]) {
      for (const [name, toolArguments] of stockToolCalls) {
        const result = await callMcpTool(harness, name, { ...toolArguments, slug });
        expect(result.isError).toBe(true);
        expect(result.text).toContain(`is not enabled for collection "${slug}"`);
      }
    }
    // The tree-state global is the config's only global: with its tools off, plugin-mcp
    // advertises no global tool at all.
    const names = (await listMcpTools(harness)).map((tool) => tool.name);
    expect(names.filter((name) => /global/iu.test(name))).toEqual([]);
    const folders = await callMcpTool(harness, "findDocuments", { slug: "folders" });
    expect(folders.isError).toBe(false);
  });

  it("keep a stock tool the host set for them", async () => {
    const harness = await boot({
      mcp: true,
      mcpOptions: {
        collections: { "folder-redirects": { tools: { find: { description: "Host find." } } } },
      } as never,
    });

    const allowed = await callMcpTool(harness, "findDocuments", { slug: "folder-redirects" });
    const other = await callMcpTool(harness, "countDocuments", { slug: "folder-redirects" });

    expect(allowed.isError).toBe(false);
    expect(other.isError).toBe(true);
  });

  it("are not touched when the mcp option is false", async () => {
    const harness = await boot({ foldersOptions: { mcp: false }, mcp: true, mcpOptions: {} });

    const result = await callMcpTool(harness, "findDocuments", { slug: "folder-redirects" });

    expect(result.isError).toBe(false);
  });
});

describe("the server instructions", () => {
  it("arrive in the initialize result and describe the tree, the order of the tools and the languages", async () => {
    const harness = await boot({ mcp: true });

    const instructions = await readMcpInstructions(harness);

    expect(instructions).toBe(foldersMcpInstructions);
    expect(instructions).toContain("pages live in folders");
    expect(instructions).toContain("previewMove, then applyTreeChange");
    expect(instructions).toContain("previewRename, then applyTreeChange");
    expect(instructions).toContain("wait for their answer");
    expect(instructions).toContain("ask the user for the text in every language");
    expect(instructions).toContain("new URLs from the tool's result");
    expect(instructions).toContain("draft argument defaults to false");
    expect(instructions).not.toMatch(/[–—]/u);
    expect(instructions?.split("\n").length).toBeLessThanOrEqual(30);
  });

  it("come after the host's own instructions", async () => {
    const harness = await boot({
      mcp: true,
      mcpOptions: {
        ...mcpPluginOptions(),
        mcp: { serverOptions: { options: { instructions: "The host's rules." } } },
      },
    });

    const instructions = await readMcpInstructions(harness);

    expect(instructions?.startsWith("The host's rules.\n\n")).toBe(true);
    expect(instructions?.endsWith(foldersMcpInstructions)).toBe(true);
  });

  it("send nothing of the plugin's with mcp.instructions false, and keep the host's", async () => {
    const withoutHost = await boot({ foldersOptions: { mcp: { instructions: false } }, mcp: true });
    const withHost = await boot({
      foldersOptions: { mcp: { instructions: false } },
      mcp: true,
      mcpOptions: {
        ...mcpPluginOptions(),
        mcp: { serverOptions: { options: { instructions: "The host's rules." } } },
      },
    });

    expect(await readMcpInstructions(withoutHost)).toBeUndefined();
    expect(await readMcpInstructions(withHost)).toBe("The host's rules.");
  });

  it("send nothing of the plugin's with the mcp option false", async () => {
    const harness = await boot({ foldersOptions: { mcp: false }, mcp: true });

    expect(await readMcpInstructions(harness)).toBeUndefined();
  });
});
