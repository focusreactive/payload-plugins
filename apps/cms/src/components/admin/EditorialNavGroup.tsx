import { NavGroup } from "@payloadcms/ui";
import type { Payload, TypedUser } from "payload";

import { ProfilesAwaitingApprovalNavLink } from "./PersonReview/ProfilesAwaitingApprovalNavLink";
import { ReviewQueueNavLink } from "./ReviewQueueNavLink";
import { SeoOverviewNavLink } from "./SeoOverviewNavLink";

/**
 * Payload renders beforeNavLinks above its own "Browse by Folder" button, so custom.scss moves that
 * button back to the top of the nav and this group sits between it and the collection groups.
 */
export const EditorialNavGroup = ({
  payload,
  user,
}: {
  payload: Payload;
  user?: TypedUser | null;
}) => (
  <NavGroup label="Editorial">
    <ReviewQueueNavLink />
    <ProfilesAwaitingApprovalNavLink payload={payload} user={user} />
    <SeoOverviewNavLink />
  </NavGroup>
);
