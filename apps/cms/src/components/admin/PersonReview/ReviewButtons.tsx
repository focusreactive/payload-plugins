"use client";

import { PublishButton, UnpublishButton, useAuth } from "@payloadcms/ui";

import type { User } from "@/payload-types";

/**
 * A fee-earner sees Submit for review where an editor sees Publish. It is the same button, and the
 * server turns the fee-earner's publish into a draft marked as submitted, so hiding the label is
 * presentation only: the rule itself lives in the Person collection's hooks.
 */
export const PublishOrSubmitForReview = () => {
  const { user } = useAuth<User>();
  if (user?.role === "user") return <PublishButton label="Submit for review" />;
  return <PublishButton />;
};

export const UnpublishForEditorsOnly = () => {
  const { user } = useAuth<User>();
  if (user?.role === "user") return null;
  return <UnpublishButton />;
};
