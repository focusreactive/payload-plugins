import { defineWorkflow, fireWorkflowAction } from "@focus-reactive/payload-plugin-workflows";
import type { InstanceView } from "@focus-reactive/payload-plugin-workflows";
import {
  workflowAgentTools,
  workflowMcpTools,
} from "@focus-reactive/payload-plugin-workflows/agent";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { handleEndpoints } from "payload";
import type { CollectionSlug, Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BASE_WORKFLOWS, bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// The workflow tools through @payloadcms/plugin-mcp, driven through Payload's own HTTP handler
// (`handleEndpoints`, what the Next.js route runs) with an MCP API key, as an MCP client would.

/** One step reserved for a person: `approve`. `note` is open to agents. */
const signoff = defineWorkflow({
  name: "signoff",
  collections: ["pages"],
  initialStage: "review",
  stages: [
    {
      name: "review",
      actions: [{ name: "note" }, { name: "approve", status: "done", agents: "deny" }],
      transitions: [{ name: "done", to: "done" }],
    },
    { name: "done" },
  ],
});

const TOOL_NAMES = [
  "workflows_list_definitions",
  "workflows_list_instances",
  "workflows_get_state",
  "workflows_start",
  "workflows_fire_action",
];

let booted: WorkflowsTestPayload;
let payload: Payload;
let author: TypedUser;
let editor: TypedUser;
let blind: TypedUser;
const keys: Record<string, string> = {};

const createUser = async (email: string, roles: string[]): Promise<TypedUser> => {
  const doc = await payload.create({
    collection: "users",
    data: { email, password: "test-password-1", roles } as never,
  });
  return { ...doc, collection: "users" } as unknown as TypedUser;
};

const createKey = async (
  name: string,
  user: TypedUser,
  tools: Record<string, boolean> = {},
  more: Record<string, unknown> = {}
) => {
  const apiKey = `key-${name}-${"x".repeat(24)}`;
  await payload.create({
    collection: "payload-mcp-api-keys" as CollectionSlug,
    data: {
      user: user.id,
      label: name,
      enableAPIKey: true,
      apiKey,
      "payload-mcp-tool": tools,
      ...more,
    } as never,
  });
  keys[name] = apiKey;
};

const createPage = async (title: string) =>
  payload.create({ collection: "pages", data: { title } as never, draft: true });

let rpcId = 0;
/** One JSON-RPC call to /api/mcp with `key`; the streamable-HTTP answer may come as SSE. */
const rpc = async (key: string, method: string, params: Record<string, unknown> = {}) => {
  rpcId += 1;
  const response = await handleEndpoints({
    config: payload.config,
    request: new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: rpcId, method, params }),
    }),
  });
  const text = await response.text();
  const data = text.includes("data: ")
    ? text
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .at(-1)
    : text;
  return { status: response.status, body: JSON.parse(data ?? "null") };
};

/** tools/call; the tool's answer is JSON in the first text block. */
const call = async (key: string, name: string, args: Record<string, unknown>) => {
  const { body } = await rpc(key, "tools/call", { name, arguments: args });
  if (body.error) {
    return { rpcError: body.error as { code: number; message: string } };
  }
  const result = body.result as { content: { text: string }[]; isError?: boolean };
  let parsed: unknown = result.content[0]?.text;
  try {
    parsed = JSON.parse(result.content[0]?.text ?? "null");
  } catch {
    // A protocol-level refusal (unknown tool) is plain text.
  }
  return { isError: result.isError === true, value: parsed as Record<string, unknown> };
};

const actionOf = (view: InstanceView, name: string) =>
  view.activities.flatMap((activity) => activity.actions).find((action) => action.name === name);

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [...BASE_WORKFLOWS, signoff],
    plugins: [
      mcpPlugin({
        collections: { pages: { enabled: { find: true } } },
        mcp: { tools: workflowMcpTools() },
      }),
    ],
  });
  payload = booted.payload;
  author = await createUser("author@mcp.local", []);
  editor = await createUser("editor@mcp.local", ["editor"]);
  blind = await createUser("blind@mcp.local", ["blind", "editor"]);
  await createKey("author", author);
  await createKey("editor", editor);
  await createKey("blind", blind);
  await createKey(
    "off",
    editor,
    Object.fromEntries(
      [
        "workflowsListDefinitions",
        "workflowsListInstances",
        "workflowsGetState",
        "workflowsStart",
        "workflowsFireAction",
      ].map((name) => [name, false])
    ),
    // Something else stays on, so the key still lists tools.
    { pages: { find: true } }
  );
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("workflow tools over MCP", () => {
  it("initialize, then tools/list shows the five tools with their parameters", async () => {
    const init = await rpc(keys.editor!, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "int-test", version: "1" },
    });
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo).toBeDefined();
    const { body } = await rpc(keys.editor!, "tools/list");
    const tools = body.result.tools as { name: string; inputSchema: { properties: object } }[];
    const names = tools.map((tool) => tool.name);
    for (const name of TOOL_NAMES) {
      expect(names).toContain(name);
    }
    const fire = tools.find((tool) => tool.name === "workflows_fire_action")!;
    expect(Object.keys(fire.inputSchema.properties)).toEqual([
      "instanceId",
      "activity",
      "action",
      "params",
    ]);
    const state = tools.find((tool) => tool.name === "workflows_get_state")!;
    expect(Object.keys(state.inputSchema.properties)).toEqual(["collectionSlug", "documentId"]);
  });

  it("no key, or an unknown key, is refused before any tool runs", async () => {
    const response = await handleEndpoints({
      config: payload.config,
      request: new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      }),
    });
    expect(response.status).toBe(401);
    expect((await rpc("not-a-key", "tools/list")).status).toBe(401);
  });

  it("lists, starts, reads and moves a run as the key's user; the history says agent", async () => {
    const defs = await call(keys.author!, "workflows_list_definitions", {});
    expect(defs.isError).toBe(false);
    expect((defs.value!.definitions as { name: string }[]).map((d) => d.name)).toContain("review");

    const page = await createPage("MCP page");
    const started = await call(keys.author!, "workflows_start", {
      workflow: "review",
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    expect(started.isError).toBe(false);
    const run = started.value as unknown as InstanceView;
    expect(run.stage.name).toBe("drafting");
    expect(run.history[0]?.actor).toMatchObject({
      id: String(author.id),
      collection: "users",
      via: "agent",
    });

    const submitted = await call(keys.author!, "workflows_fire_action", {
      instanceId: run.id,
      action: "submit",
    });
    expect(submitted.isError).toBe(false);
    expect((submitted.value as unknown as InstanceView).stage.name).toBe("review");

    // The author is not an editor: the review is not theirs to take, as in the admin.
    const notMine = await call(keys.author!, "workflows_fire_action", {
      instanceId: run.id,
      action: "claim",
    });
    expect(notMine.isError).toBe(true);
    expect(notMine.value).toMatchObject({ code: "not-allowed" });

    const listed = await call(keys.editor!, "workflows_list_instances", { scope: "mine" });
    expect(listed.isError).toBe(false);
    expect((listed.value!.docs as { id: string }[]).map((doc) => doc.id)).toContain(run.id);

    const claimed = await call(keys.editor!, "workflows_fire_action", {
      instanceId: run.id,
      action: "claim",
    });
    expect(claimed.isError).toBe(false);
    const approved = await call(keys.editor!, "workflows_fire_action", {
      instanceId: run.id,
      action: "approve",
    });
    expect(approved.isError).toBe(false);
    expect((approved.value as unknown as InstanceView).stage.name).toBe("approved");

    const state = await call(keys.editor!, "workflows_get_state", {
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    const [view] = state.value!.instances as InstanceView[];
    const steps = view!.history.filter((entry) => entry.type === "action" && entry.actor.id);
    expect(steps.map((entry) => entry.actor.via)).toEqual(["agent", "agent", "agent"]);
    expect(steps.map((entry) => entry.actor.id)).toEqual([
      String(author.id),
      String(editor.id),
      String(editor.id),
    ]);
  });

  it("a document the key's user cannot read is unknown to the tools", async () => {
    const page = await createPage("Secret");
    const state = await call(keys.blind!, "workflows_get_state", {
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    expect(state.isError).toBe(true);
    expect(state.value).toMatchObject({ code: "unknown-subject" });
    const start = await call(keys.blind!, "workflows_start", {
      workflow: "review",
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    expect(start.value).toMatchObject({ code: "unknown-subject" });
  });

  it("a key with the workflow tools switched off neither lists nor calls them", async () => {
    const { body } = await rpc(keys.off!, "tools/list");
    const names = (body.result.tools as { name: string }[]).map((tool) => tool.name);
    expect(names.length).toBeGreaterThan(0);
    for (const name of TOOL_NAMES) {
      expect(names).not.toContain(name);
    }
    const page = await createPage("Off page");
    const refused = await call(keys.off!, "workflows_start", {
      workflow: "review",
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    // Not registered for this key: the MCP server refuses the call itself.
    expect(refused.isError).toBe(true);
    expect(String(refused.value)).toMatch(/workflows_start/u);
    const runs = await payload.find({
      collection: "workflow-instances" as CollectionSlug,
      where: { subjectId: { equals: String(page.id) } },
    });
    expect(runs.totalDocs).toBe(0);
  });
});

describe('agents: "deny" on both agent surfaces', () => {
  const reserved = { reasonCode: "agents", reason: "This step is reserved for a person." };

  it("MCP: the agent sees the step as not allowed and is refused; the admin path succeeds", async () => {
    const page = await createPage("Signoff MCP");
    const started = await call(keys.editor!, "workflows_start", {
      workflow: "signoff",
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    const run = started.value as unknown as InstanceView;
    expect(actionOf(run, "approve")).toMatchObject({ allowed: false, ...reserved });
    expect(actionOf(run, "note")).toMatchObject({ allowed: true });

    const state = await call(keys.editor!, "workflows_get_state", {
      collectionSlug: "pages",
      documentId: String(page.id),
    });
    const [view] = state.value!.instances as InstanceView[];
    expect(actionOf(view!, "approve")).toMatchObject({ allowed: false, ...reserved });

    const refused = await call(keys.editor!, "workflows_fire_action", {
      instanceId: run.id,
      action: "approve",
    });
    expect(refused.isError).toBe(true);
    expect(refused.value).toEqual({
      error: "This step is reserved for a person.",
      code: "not-allowed",
    });
    const noted = await call(keys.editor!, "workflows_fire_action", {
      instanceId: run.id,
      action: "note",
    });
    expect(noted.isError).toBe(false);

    const byPerson = await fireWorkflowAction(payload, {
      instanceId: run.id!,
      action: "approve",
      user: editor,
      via: "admin",
    });
    expect(byPerson.stage.name).toBe("done");
    expect(actionOf(byPerson, "approve")).toBeUndefined();
  });

  it("AI-SDK tools: the same refusal and the same view", async () => {
    const tools = workflowAgentTools({ payload, user: editor });
    const page = await createPage("Signoff SDK");
    const run = (await tools.workflows_start.execute({
      workflow: "signoff",
      collectionSlug: "pages",
      documentId: String(page.id),
    })) as InstanceView;
    expect(actionOf(run, "approve")).toMatchObject({ allowed: false, ...reserved });
    const state = (await tools.workflows_get_state.execute({
      collectionSlug: "pages",
      documentId: String(page.id),
    })) as { instances: InstanceView[] };
    expect(actionOf(state.instances[0]!, "approve")).toMatchObject({
      allowed: false,
      ...reserved,
    });
    await expect(
      tools.workflows_fire_action.execute({ instanceId: run.id!, action: "approve" })
    ).resolves.toEqual({ error: "This step is reserved for a person.", code: "not-allowed" });

    // The same user in the admin: the step is theirs to take.
    const { getWorkflowState } = await import("@focus-reactive/payload-plugin-workflows");
    const asPerson = await getWorkflowState(payload, {
      collection: "pages",
      id: String(page.id),
      user: editor,
    });
    expect(actionOf(asPerson.instances[0]!, "approve")).toMatchObject({ allowed: true });
    const byPerson = await fireWorkflowAction(payload, {
      instanceId: run.id!,
      action: "approve",
      user: editor,
      via: "admin",
    });
    expect(byPerson.stage.name).toBe("done");
    const approval = byPerson.history.find(
      (entry) => entry.type === "action" && entry.action === "approve"
    );
    expect(approval?.actor).toMatchObject({ via: "admin" });
  });
});
