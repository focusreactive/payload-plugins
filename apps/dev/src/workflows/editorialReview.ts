import { defineWorkflow } from "@focus-reactive/payload-plugin-workflows";
import type { CallerCondition, EffectHandler } from "@focus-reactive/payload-plugin-workflows";

/**
 * The README's editorial review on `pages`. Whoever starts it is the author and owns the drafting;
 * dev users have no roles, so review uses the claim pattern: anyone but the author may take the
 * review, after which only the reviewer may decide.
 */
/** An author never reviews their own work. */
const notAuthor: CallerCondition = ({ actor, fields }) => actor.id !== fields.author;

export const editorialReview = defineWorkflow({
  name: "editorial-review",
  title: "Editorial review",
  description: "Draft, review and approve a page before it is published.",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [
    { name: "author", type: "user", title: "Author", initialValue: ({ actor }) => actor.id },
    { name: "reviewer", type: "user", title: "Reviewer" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      title: "Drafting",
      assignee: "author",
      actions: [{ name: "submit", title: "Submit for review", status: "done" }],
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      title: "Review",
      guards: [
        {
          name: "hold-publish",
          title: "A reviewer must approve this page first.",
          operations: ["publish"],
        },
      ],
      assignee: "reviewer",
      actions: [
        { name: "reset", when: () => true, set: { decision: null, reason: null } },
        {
          name: "claim",
          title: "Take this review",
          filter: ({ actor, fields }) => !fields.reviewer && actor.id !== fields.author,
          set: ({ actor }) => ({ reviewer: actor.id }),
        },
        {
          name: "approve",
          title: "Approve",
          status: "done",
          filter: notAuthor,
          set: { decision: "approved" },
          effects: ["notify-author"],
        },
        {
          name: "reject",
          title: "Request changes",
          status: "done",
          filter: notAuthor,
          params: [{ name: "reason", type: "text", title: "Reason", required: true }],
          set: ({ params }) => ({ decision: "rejected", reason: params.reason }),
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

/** Demo effect: a real one would email the author. */
export const notifyAuthor: EffectHandler = ({ payload, instance }) => {
  payload.logger.info(
    `[workflows] "${instance.subject?.title ?? instance.subject?.id}" was approved; the author would be notified now.`
  );
};
