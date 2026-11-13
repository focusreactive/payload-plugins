import { afterEach, describe, expect, it, vi } from "vitest";

import { mcpPluginOptions } from "../../dev/mcpPluginOptions.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { callMcpTool, listMcpTools, mcpEndpointStatus } from "../helpers/mcpClient.js";
import { clearTree } from "../helpers/seedTree.js";
import { createFolder, createPage } from "../helpers/treeFixtures.js";

/**
 * The folders plugin reaches `@payloadcms/plugin-mcp` through the plugins map Payload hands every
 * plugin, and adds its tools to plugin-mcp's options before plugin-mcp runs. The real tool list
 * is replaced by one probe tool so these tests cover the merge alone, whatever tools exist.
 */
vi.mock("../../src/mcp/tools.js", () => ({
  buildFoldersMcpTools: () => ({
    probeTree: {
      description: "A tool the folders plugin adds, for the merge tests.",
      handler: ({ req }: { req: { user?: { email?: string } | null } }) => ({
        content: [{ text: `folders probe for ${req.user?.email ?? "nobody"}`, type: "text" }],
      }),
    },
  }),
}));

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

const toolNames = async (harness: TestPayload) =>
  (await listMcpTools(harness)).map((tool) => tool.name);

const expectProbeCallable = async (harness: TestPayload) => {
  expect(await toolNames(harness)).toContain("probeTree");
  const result = await callMcpTool(harness, "probeTree");
  expect(result.isError).toBe(false);
  expect(result.text).toBe("folders probe for endpoint-tester@example.com");
};

describe("the folders plugin adds its tools to plugin-mcp", () => {
  it("lists and runs a tool when plugin-mcp was registered with options", async () => {
    const harness = await boot({ mcp: true });

    await expectProbeCallable(harness);
    // The host's own options are kept: the stock find tool is still there.
    expect(await toolNames(harness)).toContain("findDocuments");
  });

  it("lists and runs a tool when plugin-mcp was registered with no options", async () => {
    const harness = await boot({ mcp: true, mcpOptions: "none" });

    await expectProbeCallable(harness);
  });

  it("keeps a tool the host set under the same name", async () => {
    const harness = await boot({
      mcp: true,
      mcpOptions: {
        ...mcpPluginOptions(),
        tools: {
          probeTree: {
            description: "The host's own tool.",
            handler: () => ({ content: [{ text: "host probe", type: "text" }] }),
          },
        },
      },
    });

    expect((await toolNames(harness)).filter((name) => name === "probeTree")).toHaveLength(1);
    expect((await callMcpTool(harness, "probeTree")).text).toBe("host probe");
  });

  it("keeps the host's other tools beside its own", async () => {
    const harness = await boot({
      mcp: true,
      mcpOptions: {
        ...mcpPluginOptions(),
        tools: {
          hostTool: {
            description: "The host's own tool.",
            handler: () => ({ content: [{ text: "host tool", type: "text" }] }),
          },
        },
      },
    });

    expect(await toolNames(harness)).toEqual(expect.arrayContaining(["hostTool", "probeTree"]));
  });

  it("adds nothing and breaks nothing when plugin-mcp is not registered", async () => {
    const harness = await boot({});

    expect(await mcpEndpointStatus(harness)).toBe(404);
    const folder = await createFolder(harness.payload, { slug: "products" });
    expect(folder.id).toBeDefined();
  });
});

describe("the mcp option", () => {
  it("adds nothing with mcp: false, and the updateDocument refusal stays", async () => {
    const harness = await boot({ foldersOptions: { mcp: false }, mcp: true });

    expect(await toolNames(harness)).not.toContain("probeTree");
    const products = await createFolder(harness.payload, { slug: "products" });
    const guides = await createFolder(harness.payload, { slug: "guides" });
    const page = await createPage(harness.payload, { folder: products.id, slug: "gift-cards" });
    const result = await callMcpTool(harness, "updateDocument", {
      data: { folder: guides.id },
      id: page.id,
      slug: "pages",
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("cannot be changed through MCP updateDocument");
  });

  it("leaves one tool out with mcp.tools set to false for it", async () => {
    const harness = await boot({
      foldersOptions: { mcp: { tools: { probeTree: false } } } as never,
      mcp: true,
    });

    expect(await toolNames(harness)).not.toContain("probeTree");
  });

  it("still adds the tools with mcp.instructions: false", async () => {
    const harness = await boot({ foldersOptions: { mcp: { instructions: false } }, mcp: true });

    await expectProbeCallable(harness);
  });

  it("adds nothing when the plugin is disabled", async () => {
    const harness = await boot({ foldersOptions: { disabled: true }, mcp: true });

    expect(await toolNames(harness)).not.toContain("probeTree");
  });
});
