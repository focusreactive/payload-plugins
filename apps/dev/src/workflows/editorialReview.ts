import { defineWorkflow } from "@focus-reactive/payload-plugin-workflows";
import type { EffectHandler } from "@focus-reactive/payload-plugin-workflows";

/**
 * The spec's editorial review on `pages`. Dev users have no roles, so review uses the claim
 * pattern: anyone may take the review, after which only the reviewer may decide.
 */
export const editorialReview = defineWorkflow({
  name: "editorial-review",
  title: "Editorial review",
  description: "Draft, review and approve a page before it is published.",
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
        {
          name: "approved",
          to: "approved",
          when: ({ fields }) => fields.decision === "approved",
        },
        { name: "back", to: "drafting", when: ({ fields }) => fields.decision === "rejected" },
      ],
    },
    { name: "approved", title: "Approved" },
  ],
});

/** Demo effect: a real one would email the author. */
export const notifyAuthor: EffectHandler = ({ payload, instance }) => {
  payload.logger.info(
    `[workflows] "${instance.subject?.title ?? instance.subject?.id}" was approved; the author would be notified now.`
  );
};
