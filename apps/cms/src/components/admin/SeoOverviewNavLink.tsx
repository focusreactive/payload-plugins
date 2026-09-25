import { Link } from "@payloadcms/ui";

export const SeoOverviewNavLink = () => {
  return (
    <Link className="nav__link" href="/admin/seo-overview" prefetch={false}>
      <span className="nav__link-label">SEO overview</span>
    </Link>
  );
};
