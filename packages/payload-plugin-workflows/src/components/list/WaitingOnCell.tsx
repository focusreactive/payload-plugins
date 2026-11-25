"use client";

import { useAuth, useConfig, useListRelationships } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { useEffect } from "react";

import { decodeAssignees } from "../../assignees.js";
import { waitingOnText } from "../shared/format.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/**
 * The workflows list's "Waiting on" cell: the users by name ("You" for the viewer) and the roles;
 * "Anyone" for an open run that waits on nobody in particular. Names load like Payload's
 * relationship cells, with the viewer's access; an unreadable user stays an id.
 */
export const WaitingOnCell = ({ cellData, rowData }: DefaultCellComponentProps) => {
  const { t } = useWorkflowsT();
  const { user } = useAuth();
  const { config, getEntityConfig } = useConfig();
  const { documents, getRelationships } = useListRelationships();
  const slug = config.admin.user;
  const { users, roles } = decodeAssignees(cellData);
  const wanted = users.join(",");

  useEffect(() => {
    if (wanted) {
      getRelationships(wanted.split(",").map((value) => ({ relationTo: slug, value })));
    }
  }, [slug, wanted, getRelationships]);

  const field = getEntityConfig({ collectionSlug: slug })?.admin?.useAsTitle;
  const labels: Record<string, string> = {};
  for (const id of users) {
    const doc = (documents[slug]?.[id] || undefined) as Record<string, unknown> | undefined;
    const label = [field ? doc?.[field] : undefined, doc?.email].find(
      (value): value is string => typeof value === "string" && value.trim() !== ""
    );
    if (label) {
      labels[id] = label;
    }
  }
  const text = waitingOnText(
    { users, roles },
    { me: user ? String(user.id) : undefined, labels },
    t
  );
  if (!text) {
    return <span>{rowData.status === "active" ? t("anyone") : ""}</span>;
  }
  // A cell starts a phrase of its own: "You", not "you".
  return <span>{text.charAt(0).toUpperCase() + text.slice(1)}</span>;
};
