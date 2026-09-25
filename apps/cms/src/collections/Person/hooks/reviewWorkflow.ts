import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook } from "payload";

import { isFeeEarner } from "@/lib/access/feeEarner";
import type { Person } from "@/payload-types";

/**
 * A fee-earner's save must never reach the published profile, whichever button or API call sent
 * it. Payload writes to the live document unless the request carries both the draft flag and a
 * draft status, so both are forced here, before Payload decides where the write goes. Access
 * control cannot do this: it can refuse a write, but it cannot turn a publish into a draft.
 */
export const keepFeeEarnerEditsInDraft: CollectionBeforeOperationHook<"person"> = ({
  args,
  operation,
}) => {
  if (operation !== "update" || !isFeeEarner(args.req?.user)) return args;
  // The fee-earner's "Submit for review" button is Payload's publish button relabelled, so a
  // publish request from them is the submission.
  const submitted = args.data?._status === "published";
  args.req.context = { ...args.req.context, feeEarnerSubmittedForReview: submitted };
  return {
    ...args,
    draft: true,
    data: args.data ? { ...args.data, _status: "draft" } : args.data,
  };
};

/**
 * Runs after field access has already stripped what a fee-earner may not write, which is why the
 * review status is set here and not in the operation hook above: the status field is read-only
 * to them, so a value set earlier would be thrown away.
 */
export const trackReviewStatus: CollectionBeforeChangeHook<Person> = ({ data, req }) => {
  if (isFeeEarner(req.user)) {
    return {
      ...data,
      reviewStatus: req.context.feeEarnerSubmittedForReview ? "submitted" : "draft",
    };
  }
  // Publishing is the approval, so the review round is over and its note goes with it.
  if (data._status === "published") {
    return { ...data, reviewStatus: null, reviewerNote: null };
  }
  return data;
};
