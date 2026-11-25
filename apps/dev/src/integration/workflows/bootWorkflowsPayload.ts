import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  WORKFLOW_BYPASS,
  defineWorkflow,
  workflowsPlugin,
} from "@focus-reactive/payload-plugin-workflows";
import type {
  EffectHandler,
  WorkflowDefinition,
  WorkflowsPluginOptions,
} from "@focus-reactive/payload-plugin-workflows";
import { buildConfig, getPayload } from "payload";
import type { Config, Payload, Plugin } from "payload";

import { createTestDatabase } from "../../lib/database/resolveAdapter";

/** The editorial review in the short form (plain stage `actions`), with a role pool for the inbox. */
export const review = defineWorkflow({
  name: "review",
  title: "Review",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [
    { name: "reviewer", type: "user" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      actions: [{ name: "submit", status: "done" }],
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      guards: [
        {
          name: "hold-publish",
          title: "Publishing is held until review is approved",
          operations: ["publish"],
        },
      ],
      assignee: "reviewer",
      roles: ["editor"],
      actions: [
        { name: "reset", when: () => true, set: { decision: null, reason: null } },
        {
          name: "claim",
          filter: ({ fields }) => !fields.reviewer,
          set: ({ actor }) => ({ reviewer: actor.id }),
        },
        {
          name: "approve",
          status: "done",
          set: { decision: "approved" },
          effects: ["notify-author"],
        },
        {
          name: "reject",
          status: "done",
          params: [{ name: "reason", type: "text", required: true }],
          set: ({ params }) => ({ decision: "rejected", reason: params.reason }),
        },
      ],
      transitions: [
        { name: "approved", to: "approved", when: ({ fields }) => fields.decision === "approved" },
        { name: "back", to: "drafting", when: ({ fields }) => fields.decision === "rejected" },
      ],
    },
    { name: "approved" },
  ],
});

/** An async step that reports back: the effect's `{ set }` is what moves the run. */
export const aiCheck = defineWorkflow({
  name: "ai-check",
  collections: ["pages"],
  initialStage: "checking",
  fields: [{ name: "verdict", type: "string" }],
  stages: [
    {
      name: "checking",
      activities: [
        {
          name: "check",
          actions: [
            { name: "ask", when: () => true, effects: ["llm-check"] },
            { name: "override", status: "done" },
          ],
        },
      ],
      transitions: [
        { name: "pass", to: "passed", when: ({ fields }) => fields.verdict === "pass" },
        { name: "overridden", to: "passed" },
      ],
    },
    { name: "passed" },
  ],
});

const llmCheck: EffectHandler = () => ({ set: { verdict: "pass" } });

/**
 * Effects queued from a document save: auto-starts on a page titled "Effect…", and checks once the
 * title is "Effect go" (on create, or on a later save).
 */
export const onSave = defineWorkflow({
  name: "on-save",
  collections: ["pages"],
  start: {
    on: "create",
    when: ({ doc }) => typeof doc.title === "string" && doc.title.startsWith("Effect"),
  },
  initialStage: "waiting",
  fields: [{ name: "verdict", type: "string" }],
  stages: [
    {
      name: "waiting",
      activities: [
        {
          name: "wait",
          actions: [
            { name: "go", when: ({ doc }) => doc?.title === "Effect go", effects: ["llm-check"] },
            { name: "skip", status: "done" },
          ],
        },
      ],
      transitions: [
        { name: "pass", to: "passed", when: ({ fields }) => fields.verdict === "pass" },
      ],
    },
    { name: "passed" },
  ],
});

/** Two effects in one action, run one after the other: the first sets the guard bypass. */
export const leak = defineWorkflow({
  name: "leak",
  collections: ["pages"],
  initialStage: "a",
  stages: [
    {
      name: "a",
      activities: [
        {
          name: "x",
          actions: [{ name: "go", status: "done", effects: ["set-bypass", "read-bypass"] }],
        },
      ],
      transitions: [{ name: "next", to: "b" }],
    },
    { name: "b" },
  ],
});

/** An effect whose handler throws. */
export const flaky = defineWorkflow({
  name: "flaky",
  collections: ["pages"],
  initialStage: "a",
  stages: [
    {
      name: "a",
      activities: [
        {
          name: "x",
          actions: [
            { name: "go", effects: ["boom"] },
            { name: "end", status: "done" },
          ],
        },
      ],
      transitions: [{ name: "next", to: "b" }],
    },
    { name: "b" },
  ],
});

/** Moves on the tick once `gate.open` (a stand-in for a `now`-based condition). */
export const gate = { open: false };
export const timer = defineWorkflow({
  name: "timer",
  collections: ["pages"],
  initialStage: "wait",
  fields: [{ name: "label", type: "string", input: true }],
  stages: [
    {
      name: "wait",
      transitions: [{ name: "due", to: "done", when: () => gate.open }],
    },
    { name: "done" },
  ],
});

/** Starts itself when a page titled "Auto" is created; a guard on delete while it runs. */
export const autoStart = defineWorkflow({
  name: "auto-start",
  collections: ["pages"],
  start: { on: "create", when: ({ doc }) => doc.title === "Auto" },
  initialStage: "open",
  stages: [
    {
      name: "open",
      guards: [{ name: "keep", title: "Cannot delete while open", operations: ["delete"] }],
      activities: [{ name: "close", actions: [{ name: "close", status: "done" }] }],
      transitions: [{ name: "closed", to: "closed" }],
    },
    { name: "closed" },
  ],
});

export const BASE_WORKFLOWS = [review, aiCheck, autoStart];

export type WorkflowsTestPayload = {
  payload: Payload;
  notified: string[];
  /** What `read-bypass` saw on `req.context.workflowBypass`, per run. */
  bypassSeen: boolean[];
  cleanup: () => Promise<void>;
};

/** True when the suite runs on Postgres (`DB_ADAPTER=postgres`), the only adapter here with concurrent writers. */
export const ON_POSTGRES = process.env.DB_ADAPTER === "postgres";

/**
 * A headless Payload with transactions ON so the outbox (state change + effect job in one
 * transaction) runs for real. One boot per spec file (see the translator's `bootTestPayload` for
 * why). The database follows `DB_ADAPTER` (`createTestDatabase`): a throwaway SQLite file by default,
 * a fresh schema in `POSTGRES_TEST_URL` with `DB_ADAPTER=postgres`, dropped by `cleanup`.
 */
export async function bootWorkflowsPayload(
  options: {
    jobs?: Config["jobs"];
    /** Database transactions (default on). Off, hook-queued effects run inline. */
    transactions?: boolean;
    workflows?: WorkflowDefinition[];
    access?: WorkflowsPluginOptions["access"];
    /** More plugins, after the workflows plugin (e.g. the MCP plugin). */
    plugins?: Plugin[];
  } = {}
): Promise<WorkflowsTestPayload> {
  const dir = mkdtempSync(join(tmpdir(), "workflows-int-"));
  const { db, drop } = createTestDatabase(join(dir, "test.db"), {
    transactions: options.transactions !== false,
  });
  const notified: string[] = [];
  const bypassSeen: boolean[] = [];
  const notifyAuthor: EffectHandler = ({ instance }) => {
    notified.push(instance.subject?.id ?? "?");
  };

  const config = await buildConfig({
    secret: "integration-test-secret",
    db,
    telemetry: false,
    ...(options.jobs ? { jobs: options.jobs } : {}),
    typescript: { autoGenerate: false },
    collections: [
      {
        slug: "users",
        auth: true,
        fields: [{ name: "roles", type: "text", hasMany: true }],
      },
      // Another auth collection (API clients): not the admin user collection.
      { slug: "clients", auth: true, fields: [] },
      {
        slug: "pages",
        admin: { useAsTitle: "title" },
        versions: { drafts: true },
        trash: true,
        access: {
          // A user with the role "blind" cannot read pages titled "Secret"; "no-pages", none.
          read: ({ req }) => {
            const userRoles = (req.user as { roles?: string[] } | null)?.roles ?? [];
            if (userRoles.includes("no-pages")) {
              return false;
            }
            return userRoles.includes("blind")
              ? { title: { not_equals: "Secret" } }
              : Boolean(req.user);
          },
        },
        fields: [{ name: "title", type: "text" }],
      },
      // Exists, but no workflow runs on it.
      { slug: "posts", fields: [{ name: "title", type: "text" }] },
    ],
    plugins: [
      workflowsPlugin({
        workflows: options.workflows ?? BASE_WORKFLOWS,
        effects: {
          "notify-author": notifyAuthor,
          "llm-check": llmCheck,
          "set-bypass": ({ req }) => {
            req.context[WORKFLOW_BYPASS] = true;
          },
          "read-bypass": ({ req }) => {
            bypassSeen.push(req.context?.[WORKFLOW_BYPASS] === true);
          },
          boom: () => {
            throw new Error("handler boom");
          },
        },
        ...(options.access ? { access: options.access } : {}),
      }),
      ...(options.plugins ?? []),
    ],
  });

  const payload = await getPayload({ config });

  const cleanup = async () => {
    try {
      await drop(payload);
    } catch (error) {
      // A leaked schema is invisible until the server is full of them: say so.
      console.error("bootWorkflowsPayload: could not drop the test database", error);
    }
    try {
      await payload.db.destroy?.();
    } catch {
      /* best-effort */
    }
    rmSync(dir, { recursive: true, force: true });
  };

  return { payload, notified, bypassSeen, cleanup };
}
