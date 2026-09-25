import { Link } from "@payloadcms/ui";
import type { Payload, PayloadRequest, TypedUser, Where } from "payload";

import { isFeeEarner } from "@/lib/access/feeEarner";
import { editorialInOwnMarkets } from "@/lib/access/marketScoped";

const AWAITING_APPROVAL_HREF = "/admin/collections/person?where[reviewStatus][equals]=submitted";

/**
 * The editor's side of a fee-earner's profile change. Every signed-in user can read every profile,
 * so the count is narrowed by the editor's update access instead: a local editor's number only
 * includes profiles in their own markets, the ones they can approve. The query reads drafts
 * because a submission exists only as a draft until someone publishes it.
 */
export const ProfilesAwaitingApprovalNavLink = async ({
  payload,
  user,
}: {
  payload: Payload;
  user?: TypedUser | null;
}) => {
  if (!user || isFeeEarner(user)) return null;
  const approvable = await editorialInOwnMarkets({
    req: { user } as PayloadRequest,
  });
  if (approvable === false) return null;

  const submitted: Where = { reviewStatus: { equals: "submitted" } };
  const awaiting = await payload.find({
    collection: "person",
    draft: true,
    where: approvable === true ? submitted : { and: [submitted, approvable] },
    limit: 1,
    depth: 0,
  });

  return (
    <Link className="nav__link" href={AWAITING_APPROVAL_HREF} prefetch={false}>
      <span className="nav__link-label">Profiles awaiting approval ({awaiting.totalDocs})</span>
    </Link>
  );
};
