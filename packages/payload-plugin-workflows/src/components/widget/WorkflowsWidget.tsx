import "./WorkflowsWidget.css";

import { Link, Pill } from "@payloadcms/ui";
import type { CollectionSlug, Payload, TypedUser, WidgetServerProps } from "payload";
import { formatAdminURL } from "payload/shared";
import type { ReactNode } from "react";

import { RUNS_SLUG } from "../../constants.js";
import { isWorkflowError } from "../../engine/errors.js";
import { listWorkflowDefinitions, listWorkflowInstances } from "../../server/queries.js";
import type { DefinitionSummary, InstanceSummary } from "../../server/queries.js";
import { NAMESPACE } from "../../translations.js";
import { formatDateTime, formatRelative, waitingOnText } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { PILL_STYLE, summaryToneOf } from "../shared/indicator.js";

/** Rows under "Waiting on you". */
const WAITING_ROWS = 5;
/** Cards per board column. */
const COLUMN_CARDS = 3;
/** Boards, one per workflow with open documents. */
const BOARDS = 3;
/** Open runs read for the boards (the most recently changed). */
const BOARD_RUNS = 100;

/** Display names for user ids, read with the viewer's access; unreadable ones stay ids. */
const peopleOf = async (payload: Payload, user: TypedUser, ids: string[]): Promise<People> => {
  const me = String(user.id);
  const wanted = [...new Set(ids)].filter((id) => id !== me);
  const labels: Record<string, string> = {};
  if (wanted.length > 0) {
    const slug = payload.config.admin.user as CollectionSlug;
    const field = payload.collections[slug]?.config.admin?.useAsTitle;
    const found = await payload
      .find({
        collection: slug,
        where: { id: { in: wanted } },
        depth: 0,
        limit: wanted.length,
        pagination: false,
        overrideAccess: false,
        user,
      })
      .catch(() => ({ docs: [] }));
    for (const doc of found.docs as Record<string, unknown>[]) {
      const label = [field ? doc[field] : undefined, doc.email].find(
        (value): value is string => typeof value === "string" && value.trim() !== ""
      );
      if (label) {
        labels[String(doc.id)] = label;
      }
    }
  }
  return { me, labels };
};

const cardMeta = (run: InstanceSummary, people: People, t: T): string => {
  const who = waitingOnText(run.waitingOn, people, t);
  return who ? t("waitingOn", { who }) : t("waitingOnAnyone");
};

/** One column per stage that holds open documents (final stages never do), with a count. */
const Board = ({
  def,
  heading,
  runs,
  card,
  t,
}: {
  def: DefinitionSummary;
  heading: string;
  runs: InstanceSummary[];
  card: (run: InstanceSummary) => ReactNode;
  t: T;
}) => {
  const columns = def.stages
    .filter((stage) => !stage.final)
    .map((stage) => ({
      key: stage.name,
      title: stage.title,
      runs: runs.filter((run) => !run.stuck && run.stage.name === stage.name),
    }));
  const stuck = runs.filter((run) => run.stuck);
  if (stuck.length > 0) {
    columns.push({ key: "__stuck", title: t("widgetStuck"), runs: stuck });
  }
  return (
    <section aria-label={heading} className="workflows-widget__section">
      <h3 className="workflows-widget__heading">{heading}</h3>
      <div className="workflows-widget__board">
        {columns.map((column) => (
          <div className="workflows-widget__column" key={column.key}>
            <h4 className="workflows-widget__column-title">
              {column.title}
              <span className="workflows-widget__column-count">{column.runs.length}</span>
            </h4>
            {column.runs.length === 0 ? (
              <p className="workflows-widget__column-empty">{t("widgetColumnEmpty")}</p>
            ) : (
              <ul className="workflows-widget__cards">
                {column.runs.slice(0, COLUMN_CARDS).map(card)}
                {column.runs.length > COLUMN_CARDS ? (
                  <li className="workflows-widget__column-more">
                    {t("widgetMore", { count: column.runs.length - COLUMN_CARDS })}
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * The "Workflows" dashboard widget: what waits on the viewer, then a board per workflow of the
 * open documents they may see. Read with the viewer's access through the same functions as the
 * Local API; nothing for someone who may not read workflows.
 */
export const WorkflowsWidget = async ({ req, user }: WidgetServerProps) => {
  if (!user) {
    return null;
  }
  const { i18n, payload } = req;
  const t: T = (key, vars) => i18n.t(`${NAMESPACE}:${key}` as never, vars as never);
  const adminRoute = payload.config.routes.admin;
  const now = new Date();

  let waiting: Awaited<ReturnType<typeof listWorkflowInstances>>;
  let open: Awaited<ReturnType<typeof listWorkflowInstances>>;
  try {
    [waiting, open] = await Promise.all([
      listWorkflowInstances(payload, {
        scope: "mine",
        status: "active",
        limit: WAITING_ROWS,
        user,
      }),
      listWorkflowInstances(payload, { scope: "all", status: "active", limit: BOARD_RUNS, user }),
    ]);
  } catch (error) {
    if (isWorkflowError(error) && error.code === "not-allowed") {
      return null;
    }
    throw error;
  }
  const { definitions } = listWorkflowDefinitions(payload);
  const several = definitions.length > 1;
  const people = await peopleOf(
    payload,
    user,
    open.docs.flatMap((run) => run.waitingOn.users)
  );

  const listURL = `${formatAdminURL({ adminRoute, path: `/collections/${RUNS_SLUG}` })}?where[status][equals]=active`;
  const documentURL = (run: InstanceSummary) =>
    formatAdminURL({
      adminRoute,
      path: `/collections/${run.subject.collection}/${encodeURIComponent(run.subject.id)}`,
    });
  const title = (run: InstanceSummary) =>
    run.subject.title || t("untitled", { id: run.subject.id });
  const time = (run: InstanceSummary) => (
    <time dateTime={run.updatedAt} title={formatDateTime(run.updatedAt, i18n.language)}>
      {formatRelative(run.updatedAt, now, i18n.language)}
    </time>
  );
  const more = (count: number) =>
    count > 0 ? (
      <Link className="workflows-widget__more" href={listURL} prefetch={false}>
        {t("widgetMore", { count })}
      </Link>
    ) : null;

  // One board per workflow with open documents, in the order they are configured.
  const boards = definitions
    .map((def) => ({ def, runs: open.docs.filter((run) => run.workflow === def.name) }))
    .filter((board) => board.runs.length > 0);
  const shown = boards.slice(0, BOARDS);
  const unshown = open.totalDocs - shown.reduce((sum, board) => sum + board.runs.length, 0);

  return (
    <div className="workflows-widget">
      <header className="workflows-widget__header">
        <h2 className="workflows-widget__title">{t("widgetTitle")}</h2>
        <Link className="workflows-widget__all" href={listURL} prefetch={false}>
          {t("widgetViewAll")}
        </Link>
      </header>

      <section aria-labelledby="workflows-widget-waiting" className="workflows-widget__section">
        <h3 className="workflows-widget__heading" id="workflows-widget-waiting">
          {t("widgetWaiting")}
          {waiting.totalDocs > 0 ? (
            <Pill className="workflows-widget__count" pillStyle="light-gray" size="small">
              {waiting.totalDocs}
            </Pill>
          ) : null}
        </h3>
        {waiting.docs.length === 0 ? (
          <p className="workflows-widget__empty">{t("widgetWaitingEmpty")}</p>
        ) : (
          <ul className="workflows-widget__rows">
            {waiting.docs.map((run) => (
              <li className="workflows-widget__row" key={run.id}>
                <Link
                  className="workflows-widget__link workflows-widget__row-title"
                  href={documentURL(run)}
                  prefetch={false}
                >
                  {title(run)}
                </Link>
                <span className="workflows-widget__meta">
                  {[several ? run.workflowTitle : null, run.waitsOnYou ? null : t("widgetOpen")]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="workflows-widget__stage">
                  <Pill pillStyle={PILL_STYLE[summaryToneOf(run)]} size="small">
                    {run.stuck ? t("widgetStuck") : run.stage.title}
                  </Pill>
                </span>
                <span className="workflows-widget__time">{time(run)}</span>
              </li>
            ))}
          </ul>
        )}
        {more(waiting.totalDocs - waiting.docs.length)}
      </section>

      {boards.length === 0 ? (
        <section className="workflows-widget__section">
          <h3 className="workflows-widget__heading">{t("statusRunning")}</h3>
          <p className="workflows-widget__empty">{t("widgetNoneOpen")}</p>
        </section>
      ) : (
        shown.map(({ def, runs }) => (
          <Board
            def={def}
            heading={several ? def.title : t("statusRunning")}
            key={def.name}
            card={(run) => (
              <li className="workflows-widget__card" key={run.id}>
                <Link className="workflows-widget__link" href={documentURL(run)} prefetch={false}>
                  {title(run)}
                </Link>
                <span className="workflows-widget__meta">
                  {cardMeta(run, people, t)}
                  <span aria-hidden="true"> · </span>
                  {time(run)}
                </span>
              </li>
            )}
            runs={runs}
            t={t}
          />
        ))
      )}
      {more(boards.length > 0 ? unshown : 0)}
    </div>
  );
};
