import {
  abortWorkflow,
  defineWorkflow,
  fireWorkflowAction,
  getWorkflowHistory,
  getWorkflowState,
  listWorkflowInstances,
  startWorkflow,
} from "@focus-reactive/payload-plugin-workflows";
import { workflowMcpTools } from "@focus-reactive/payload-plugin-workflows/agent";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { handleEndpoints } from "payload";
import type { CollectionSlug, Payload, TypedUser } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BASE_WORKFLOWS, bootWorkflowsPayload } from "./bootWorkflowsPayload";
import type { WorkflowsTestPayload } from "./bootWorkflowsPayload";

// People are users of the admin user collection (`users`). A user of another auth collection
// (`clients`) is refused everything, whatever `access` says: same-id users of the two collections
// are different people, and user ids in runs are ids of `users`.

/** Assigned to whoever is in `reviewer`: a `user` field, an id of the admin user collection. */
const assigned = defineWorkflow({
  name: "assigned",
  collections: ["pages"],
  initialStage: "review",
  fields: [{ name: "reviewer", type: "user", input: true }],
  stages: [
    {
      name: "review",
      assignee: "reviewer",
      actions: [{ name: "approve", status: "done" }],
      transitions: [{ name: "done", to: "done" }],
    },
    { name: "done" },
  ],
});

const MESSAGE =
  'Only users of the admin user collection ("users") can take part in workflows; this request acts as a user of "clients".';

let booted: WorkflowsTestPayload;
let payload: Payload;
let user: TypedUser;
let client: TypedUser;

const create = async (collection: "users" | "clients", email: string) => {
  const doc = await payload.create({
    collection,
    data: { email, password: "test-password-1" } as never,
    overrideAccess: true,
  });
  return { ...doc, collection } as unknown as TypedUser;
};

const refusal = async (run: Promise<unknown>) => {
  try {
    await run;
    return undefined;
  } catch (error) {
    const { code, message } = error as { code?: string; message?: string };
    return { code, message };
  }
};

beforeAll(async () => {
  booted = await bootWorkflowsPayload({
    workflows: [...BASE_WORKFLOWS, assigned],
    // Callbacks that allow everyone: they may narrow access, never widen it past admin users.
    access: { start: () => true, fire: () => true, abort: () => true },
    plugins: [mcpPlugin({ userCollection: "clients", mcp: { tools: workflowMcpTools() } })],
  });
  payload = booted.payload;
  user = await create("users", "person@users.test");
  client = await create("clients", "person@clients.test");
});

afterAll(async () => {
  await booted?.cleanup();
});

describe("only users of the admin user collection take part", () => {
  it("the two users share an id, and are different people", () => {
    expect(String(client.id)).toBe(String(user.id));
  });

  it("refuses a user of another auth collection everything, though `access` allows all", async () => {
    const page = await payload.create({
      collection: "pages",
      data: { title: "Shared ids" } as never,
      draft: true,
      overrideAccess: true,
    });
    const run = await startWorkflow(payload, {
      workflow: "assigned",
      collection: "pages",
      id: page.id,
      fields: { reviewer: user.id },
      user,
    });
    const instanceId = run.id as string;
    expect(run.waitingOn.users).toEqual([String(user.id)]);
    const refused = { code: "not-allowed", message: MESSAGE };
    expect(
      await refusal(
        startWorkflow(payload, {
          workflow: "review",
          collection: "pages",
          id: page.id,
          user: client,
        })
      )
    ).toEqual(refused);
    expect(
      await refusal(fireWorkflowAction(payload, { instanceId, action: "approve", user: client }))
    ).toEqual(refused);
    expect(await refusal(abortWorkflow(payload, { instanceId, user: client }))).toEqual(refused);
    expect(
      await refusal(getWorkflowState(payload, { collection: "pages", id: page.id, user: client }))
    ).toEqual(refused);
    expect(await refusal(getWorkflowHistory(payload, { instanceId, user: client }))).toEqual(
      refused
    );
    // The assignment to user 1 of `users` is not client 1's inbox.
    expect(await refusal(listWorkflowInstances(payload, { scope: "mine", user: client }))).toEqual(
      refused
    );
    const inbox = await listWorkflowInstances(payload, { scope: "mine", user });
    expect(inbox.docs.map((doc) => [doc.id, doc.waitsOnYou])).toContainEqual([instanceId, true]);
    // Nothing moved; the assigned user still can.
    const done = await fireWorkflowAction(payload, { instanceId, action: "approve", user });
    expect(done.status).toBe("completed");
    expect(done.history.find((entry) => entry.type === "action")?.actor).toEqual({
      id: String(user.id),
      via: "api",
    });
  });

  it("MCP pointed at another auth collection: every workflow tool call is refused, saying why", async () => {
    const apiKey = `key-client-${"x".repeat(24)}`;
    await payload.create({
      collection: "payload-mcp-api-keys" as CollectionSlug,
      data: { user: client.id, label: "client", enableAPIKey: true, apiKey } as never,
      overrideAccess: true,
    });
    const call = async (name: string, args: Record<string, unknown>) => {
      const response = await handleEndpoints({
        config: payload.config,
        request: new Request("http://localhost/api/mcp", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
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
      const result = JSON.parse(data ?? "null").result as {
        content: { text: string }[];
        isError?: boolean;
      };
      return { isError: result.isError, value: JSON.parse(result.content[0]?.text ?? "null") };
    };
    const page = await payload.create({
      collection: "pages",
      data: { title: "MCP clients" } as never,
      draft: true,
      overrideAccess: true,
    });
    const calls: [string, Record<string, unknown>][] = [
      ["workflows_list_definitions", {}],
      ["workflows_list_instances", { scope: "all" }],
      ["workflows_get_state", { collectionSlug: "pages", documentId: String(page.id) }],
      [
        "workflows_start",
        { workflow: "review", collectionSlug: "pages", documentId: String(page.id) },
      ],
      ["workflows_fire_action", { instanceId: "1", action: "approve" }],
    ];
    for (const [name, args] of calls) {
      expect(await call(name, args)).toEqual({
        isError: true,
        value: { error: MESSAGE, code: "not-allowed" },
      });
    }
  });
});
