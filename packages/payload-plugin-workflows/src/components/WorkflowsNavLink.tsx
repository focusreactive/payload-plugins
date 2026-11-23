"use client";

import "./WorkflowsNavLink.css";

import { Link, useConfig } from "@payloadcms/ui";
import { usePathname } from "next/navigation.js";
import { formatAdminURL } from "payload/shared";

import { VIEW_PATH } from "../constants.js";
import { useWorkflowsT } from "./shared/useWorkflowsT.js";

/** "Workflows" in the admin nav, built from Payload's own nav link classes and active state. */
export const WorkflowsNavLink = () => {
  const { t } = useWorkflowsT();
  const pathname = usePathname();
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig();
  const href = formatAdminURL({ adminRoute, path: VIEW_PATH });
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const label = (
    <>
      {active ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">{t("viewTitle")}</span>
    </>
  );
  return (
    <div className="workflows-nav">
      {pathname === href ? (
        <div aria-current="page" className="nav__link" id="nav-workflows">
          {label}
        </div>
      ) : (
        <Link className="nav__link" href={href} id="nav-workflows" prefetch={false}>
          {label}
        </Link>
      )}
    </div>
  );
};
