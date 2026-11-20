"use client";

import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

export const RelationsGraphNavLink = ({ viewPath }: { viewPath: `/${string}` }) => {
  const { config } = useConfig();
  const href = formatAdminURL({ adminRoute: config.routes.admin, path: viewPath });

  return (
    <Link className="nav__link" href={href} id="nav-relations-graph" prefetch={false}>
      <span className="nav__link-label">Relations graph</span>
    </Link>
  );
};
