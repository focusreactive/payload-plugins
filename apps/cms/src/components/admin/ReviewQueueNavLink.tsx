import { Link } from "@payloadcms/ui";

// Points at the Page list view pre-filtered to drafts, because a translation
// lands as a draft and this is the destination that proves a human reviews it.
export const ReviewQueueNavLink = () => {
  return (
    <Link
      className="nav__link"
      href="/admin/collections/page?where[_status][equals]=draft"
      prefetch={false}
    >
      <span className="nav__link-label">Review queue</span>
    </Link>
  );
};
