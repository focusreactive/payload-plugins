"use client";

import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

import type { InstanceSummary } from "../../server/queries.js";
import { formatDateTime, formatRelative, waitingOnText } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/** The run's document, linked to its edit view. */
export const SubjectLink = ({ run }: { run: InstanceSummary }) => {
  const { t } = useWorkflowsT();
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig();
  const href = formatAdminURL({
    adminRoute,
    path: `/collections/${run.subject.collection}/${encodeURIComponent(run.subject.id)}`,
  });
  return (
    <Link className="workflows-runs__subject" href={href} prefetch={false}>
      {run.subject.title || t("untitled", { id: run.subject.id })}
    </Link>
  );
};

/** Who the run waits on; `prefixed` says so in a sentence, for places without a column header. */
export const WaitingOn = ({
  run,
  people,
  prefixed = false,
}: {
  run: InstanceSummary;
  people: People;
  prefixed?: boolean;
}) => {
  const { t } = useWorkflowsT();
  const text = waitingOnText(run.waitingOn, people, t);
  if (prefixed) {
    return (
      <span className="workflows-runs__waiting">
        {text ? t("waitingOn", { who: text }) : t("waitingOnAnyone")}
      </span>
    );
  }
  // A column value starts a phrase of its own: "You", not "you".
  const value = text ? text.charAt(0).toUpperCase() + text.slice(1) : t("anyone");
  return <span className="workflows-runs__waiting">{value}</span>;
};

export const LastChanged = ({ run }: { run: InstanceSummary }) => {
  const { language } = useWorkflowsT();
  return (
    <time
      className="workflows-runs__time"
      dateTime={run.updatedAt}
      title={formatDateTime(run.updatedAt, language)}
    >
      {formatRelative(run.updatedAt, new Date(), language)}
    </time>
  );
};
