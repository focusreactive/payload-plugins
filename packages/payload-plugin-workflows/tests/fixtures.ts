import { defineWorkflow } from "../src/define.js";
import type { WorkflowDefinition } from "../src/types.js";

/** The spec's editorial-review example, verbatim. */
export const editorialReview = defineWorkflow({
  name: "editorial-review",
  title: "Editorial review",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [
    { name: "reviewer", type: "user", title: "Reviewer" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      title: "Drafting",
      activities: [
        {
          name: "write",
          title: "Write the page",
          actions: [{ name: "submit", title: "Submit for review", status: "done" }],
        },
      ],
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      title: "Review",
      guards: [
        {
          name: "hold-publish",
          title: "Publishing is held until review is approved",
          operations: ["publish"],
        },
      ],
      activities: [
        {
          name: "review",
          title: "Review the page",
          assignee: "reviewer",
          roles: ["editor"],
          actions: [
            { name: "reset", when: () => true, set: { decision: null, reason: null } },
            {
              name: "claim",
              title: "Take this review",
              filter: ({ fields }) => !fields.reviewer,
              set: ({ actor }) => ({ reviewer: actor.id }),
            },
            {
              name: "approve",
              title: "Approve",
              status: "done",
              set: { decision: "approved" },
              effects: ["notify-author"],
            },
            {
              name: "reject",
              title: "Request changes",
              status: "done",
              params: [{ name: "reason", type: "text", title: "Reason", required: true }],
              set: ({ params }) => ({ decision: "rejected", reason: params.reason }),
            },
          ],
        },
      ],
      transitions: [
        { name: "approved", to: "approved", when: ({ fields }) => fields.decision === "approved" },
        { name: "back", to: "drafting", when: ({ fields }) => fields.decision === "rejected" },
      ],
    },
    { name: "approved", title: "Approved" },
  ],
});

export const NOW = new Date("2026-01-01T00:00:00.000Z");

export const editor = { user: "u-editor", roles: ["editor"] };
export const author = { user: "u-author", roles: [] as string[] };

/** A minimal valid definition to vary in validation tests. */
export const minimal = (): WorkflowDefinition => ({
  name: "minimal",
  collections: ["pages"],
  initialStage: "a",
  fields: [{ name: "owner", type: "user" }],
  stages: [
    {
      name: "a",
      activities: [{ name: "work", actions: [{ name: "finish", status: "done" }] }],
      transitions: [{ name: "next", to: "b" }],
    },
    { name: "b" },
  ],
});
