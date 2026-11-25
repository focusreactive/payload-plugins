import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { workflowAgentTools, workflowMcpTools, workflowTools } from "../src/agent.js";
import { defineWorkflow } from "../src/define.js";
import { statusOf } from "../src/endpoints.js";
import { WorkflowError } from "../src/engine/errors.js";
import { fire, start, verdictFor } from "../src/engine/engine.js";
import { view } from "../src/engine/view.js";
import type { Caller, CallerActionDef, Env, UserActor } from "../src/types.js";
import { NOW } from "./fixtures.js";

const env = (): Env => ({ doc: null, now: NOW });
const as = (id: string, via: UserActor["via"], roles: string[] = []): Caller => ({
  actor: { id, collection: "users", via },
  roles,
});

/** `approve` is reserved for a person; `note` is not. The task is assigned to `owner`. */
const def = defineWorkflow({
  name: "signoff",
  collections: ["pages"],
  initialStage: "review",
  fields: [{ name: "owner", type: "user", input: true }],
  stages: [
    {
      name: "review",
      assignee: "owner",
      actions: [
        { name: "note" },
        { name: "approve", status: "done", agents: "deny" },
        { name: "narrow", agents: "deny", filter: ({ actor }) => actor.id === "nobody" },
      ],
      transitions: [{ name: "done", to: "done" }],
    },
    { name: "done" },
  ],
});

const begun = () => start(def, { actor: { system: true }, fields: { owner: "u1" } }, env()).state;
const stage = def.stages[0]!;
const activity = stage.activities![0]!;
const action = (name: string) =>
  activity.actions.find((entry) => entry.name === name) as CallerActionDef;
const verdict = (who: Caller, name: string) =>
  verdictFor(begun(), stage, activity, action(name), who, env());
const viewed = (who: Caller, name: string) =>
  view(def, begun(), who, env()).activities[0]!.actions.find((entry) => entry.name === name)!;

describe('agents: "deny"', () => {
  it("refuses an agent and no one else", () => {
    expect(verdict(as("u1", "agent"), "approve")).toEqual({
      allowed: false,
      code: "not-allowed",
      reason: "This step is reserved for a person.",
      reasonCode: "agents",
    });
    expect(verdict(as("u1", "admin"), "approve")).toEqual({ allowed: true });
    expect(verdict(as("u1", "api"), "approve")).toEqual({ allowed: true });
    // The default lets an agent do what its user may do.
    expect(verdict(as("u1", "agent"), "note")).toEqual({ allowed: true });
  });

  it("comes after the checks that refuse everyone", () => {
    expect(verdict(as("u2", "agent"), "approve")).toMatchObject({ reasonCode: "assignment" });
    expect(verdict(as("u1", "agent"), "narrow")).toMatchObject({ reasonCode: "filter" });
  });

  it("the view lists the step as not allowed with the reason; fire refuses with the same code", () => {
    expect(viewed(as("u1", "agent"), "approve")).toMatchObject({
      allowed: false,
      reason: "This step is reserved for a person.",
      reasonCode: "agents",
    });
    expect(viewed(as("u1", "admin"), "approve")).toMatchObject({ allowed: true });
    let refused: unknown;
    try {
      fire(def, begun(), { action: "approve" }, as("u1", "agent"), env());
    } catch (error) {
      refused = error;
    }
    expect(refused).toBeInstanceOf(WorkflowError);
    expect((refused as WorkflowError).code).toBe("not-allowed");
    expect(statusOf("not-allowed")).toBe(403);
    const done = fire(def, begun(), { action: "approve" }, as("u1", "admin"), env()).state;
    expect(done.stage).toBe("done");
  });
});

describe("agent tools", () => {
  const NAMES = [
    "workflows_list_definitions",
    "workflows_list_instances",
    "workflows_get_state",
    "workflows_start",
    "workflows_fire_action",
  ];
  const payload = {
    config: { custom: { workflows: { workflows: [def], roles: () => [] } } },
  } as unknown as Payload;

  it("both surfaces expose the same five tools, descriptions and schemas", () => {
    const sdk = workflowAgentTools({ payload, user: null });
    const mcp = workflowMcpTools();
    expect(Object.keys(sdk)).toEqual(NAMES);
    expect(mcp.map((tool) => tool.name)).toEqual(NAMES);
    for (const tool of mcp) {
      const shared = workflowTools[tool.name];
      expect(sdk[tool.name].description).toBe(shared.description);
      expect(tool.description).toBe(shared.description);
      expect(sdk[tool.name].inputSchema).toBe(shared.inputSchema);
      expect(tool.parameters).toBe(shared.inputSchema.shape);
      expect(z.toJSONSchema(z.object(tool.parameters))).toEqual(
        z.toJSONSchema(sdk[tool.name].inputSchema)
      );
    }
  });

  it("never names a parameter `id` or `collection`", () => {
    for (const tool of workflowMcpTools()) {
      expect(Object.keys(tool.parameters)).not.toContain("id");
      expect(Object.keys(tool.parameters)).not.toContain("collection");
    }
  });

  it("answers a refusal with { error, code } instead of throwing", async () => {
    const sdk = workflowAgentTools({ payload, user: null });
    await expect(
      sdk.workflows_get_state.execute({ collectionSlug: "pages", documentId: "1" })
    ).resolves.toEqual({ error: "You must be logged in.", code: "unauthorized" });
    await expect(
      sdk.workflows_start.execute({ workflow: "signoff", collectionSlug: "pages", documentId: "1" })
    ).resolves.toMatchObject({ code: "unauthorized" });
    await expect(
      sdk.workflows_fire_action.execute({ instanceId: "1", action: "approve" })
    ).resolves.toMatchObject({ code: "unauthorized" });
    await expect(
      sdk.workflows_fire_action.execute({ instanceId: 1 } as never)
    ).resolves.toMatchObject({ code: "invalid-params" });
    await expect(sdk.workflows_list_definitions.execute({})).resolves.toMatchObject({
      definitions: [{ name: "signoff" }],
    });
  });

  it("MCP: the same result as JSON text, flagged as an error on a refusal", async () => {
    const byName = Object.fromEntries(workflowMcpTools().map((tool) => [tool.name, tool]));
    const req = { payload, user: null } as unknown as PayloadRequest;
    const refused = await byName.workflows_get_state!.handler(
      { collectionSlug: "pages", documentId: "1" },
      req
    );
    expect(refused.isError).toBe(true);
    expect(JSON.parse(refused.content[0]!.text)).toEqual({
      error: "You must be logged in.",
      code: "unauthorized",
    });
    const listed = await byName.workflows_list_definitions!.handler({}, req);
    expect(listed.isError).toBeUndefined();
    expect(JSON.parse(listed.content[0]!.text).definitions[0].name).toBe("signoff");
  });
});
