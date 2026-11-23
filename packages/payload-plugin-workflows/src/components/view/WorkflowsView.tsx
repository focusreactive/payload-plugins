"use client";

import "./WorkflowsView.css";

import {
  Button,
  Pagination,
  SelectInput,
  SetStepNav,
  StaggeredShimmers,
  toast,
} from "@payloadcms/ui";
import { useEffect, useState } from "react";

import { ENDPOINTS } from "../../constants.js";
import type { DefinitionSummary, InstanceSummary } from "../../server/queries.js";
import { usePeople, useWorkflowsApi } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { RunsBoard } from "./RunsBoard.js";
import { RunsTable } from "./RunsTable.js";

type Scope = "mine" | "all";
type Layout = "list" | "board";

interface Page {
  docs: InstanceSummary[];
  totalDocs: number;
  page: number;
  totalPages: number;
}

const LIST_LIMIT = 20;
const BOARD_LIMIT = 100;

/**
 * The inbox at `/admin/workflows`, laid out like Payload's collection list: title and description,
 * a controls bar (whose work, which workflow, list or board), the table, page controls.
 */
export const WorkflowsView = () => {
  const { t } = useWorkflowsT();
  const api = useWorkflowsApi();
  const [scope, setScope] = useState<Scope>("mine");
  const [workflow, setWorkflow] = useState<string>("");
  const [layout, setLayout] = useState<Layout>("list");
  const [page, setPage] = useState(1);
  const [definitions, setDefinitions] = useState<DefinitionSummary[]>([]);
  const [result, setResult] = useState<Page | null>(null);

  const people = usePeople(result?.docs.flatMap((run) => run.waitingOn.users) ?? []);

  useEffect(() => {
    const load = async () => {
      try {
        const body = await api<{ definitions: DefinitionSummary[] }>(ENDPOINTS.definitions);
        setDefinitions(body.definitions);
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    void load();
  }, [api]);

  // The board is one workflow's stages: it needs a workflow, the first one unless one is chosen.
  const board =
    layout === "board"
      ? (definitions.find((def) => def.name === workflow) ?? definitions[0])
      : undefined;
  const filter = board?.name ?? workflow;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    const load = async () => {
      try {
        const body = await api<Page>(ENDPOINTS.instances, {
          query: {
            scope,
            status: "active",
            workflow: filter || undefined,
            page,
            limit: layout === "board" ? BOARD_LIMIT : LIST_LIMIT,
          },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResult(body);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          toast.error((error as Error).message);
          setResult({ docs: [], totalDocs: 0, page: 1, totalPages: 0 });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [api, scope, filter, layout, page]);

  const choose = (next: Scope) => {
    setScope(next);
    setPage(1);
  };
  const tabs: { scope: Scope; label: string }[] = [
    { scope: "mine", label: t("tabMine") },
    { scope: "all", label: t("tabAll") },
  ];
  const layouts: { layout: Layout; label: string }[] = [
    { layout: "list", label: t("viewList") },
    { layout: "board", label: t("viewBoard") },
  ];

  let content = null;
  if (result === null) {
    content = (
      <div
        aria-busy="true"
        aria-label={t("loading")}
        className="workflows-view__loading"
        role="status"
      >
        <StaggeredShimmers count={6} height={40} />
      </div>
    );
  } else if (result.docs.length === 0 && !board) {
    content = (
      <div className="no-results workflows-view__empty">
        <h3>{scope === "mine" ? t("emptyMineTitle") : t("emptyAllTitle")}</h3>
        <p>{scope === "mine" ? t("emptyMineBody") : t("emptyAllBody")}</p>
        {scope === "mine" ? (
          <div className="no-results__actions">
            <Button buttonStyle="secondary" margin={false} onClick={() => choose("all")}>
              {t("emptyMineAction")}
            </Button>
          </div>
        ) : null}
      </div>
    );
  } else if (board) {
    content = <RunsBoard definition={board} people={people} runs={result.docs} />;
  } else {
    content = <RunsTable people={people} runs={result.docs} />;
  }

  return (
    <div className="workflows-view">
      <SetStepNav nav={[{ label: t("viewTitle") }]} />
      <header className="list-header workflows-view__header">
        <div className="list-header__content">
          <div className="list-header__title-and-actions">
            <h1 className="list-header__title">{t("viewTitle")}</h1>
          </div>
        </div>
        <div className="workflows-view__description">
          <p className="view-description">{t("viewDescription")}</p>
        </div>
      </header>
      <div className="workflows-view__controls">
        <div className="workflows-view__group">
          {tabs.map((tab) => (
            <Button
              buttonStyle="tab"
              className="workflows-view__tab"
              extraButtonProps={{ "aria-pressed": scope === tab.scope }}
              key={tab.scope}
              margin={false}
              onClick={() => choose(tab.scope)}
              size="medium"
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="workflows-view__group workflows-view__group--end">
          <div className="workflows-view__filter">
            <SelectInput
              isClearable={layout === "list"}
              label={t("filterLabel")}
              name="workflows-filter"
              onChange={(option) => {
                const picked = Array.isArray(option) ? option[0] : option;
                setWorkflow(typeof picked?.value === "string" ? picked.value : "");
                setPage(1);
              }}
              options={definitions.map((def) => ({ label: def.title, value: def.name }))}
              path="workflows-filter"
              placeholder={t("filterAll")}
              value={filter || undefined}
            />
          </div>
          {layouts.map((entry) => (
            <Button
              buttonStyle="tab"
              className="workflows-view__tab"
              disabled={entry.layout === "board" && definitions.length === 0}
              extraButtonProps={{ "aria-pressed": layout === entry.layout }}
              key={entry.layout}
              margin={false}
              onClick={() => {
                setLayout(entry.layout);
                setPage(1);
              }}
              size="medium"
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </div>
      {content}
      {result && result.totalDocs > 0 && layout === "list" ? (
        <div className="page-controls workflows-view__pages">
          {result.totalPages > 1 ? (
            <Pagination
              hasNextPage={result.page < result.totalPages}
              hasPrevPage={result.page > 1}
              nextPage={result.page + 1}
              numberOfNeighbors={1}
              onChange={setPage}
              page={result.page}
              prevPage={result.page - 1}
              totalPages={result.totalPages}
            />
          ) : null}
          <div className="page-controls__page-info">
            {t("pageInfo", {
              from: (result.page - 1) * LIST_LIMIT + 1,
              to: Math.min(result.page * LIST_LIMIT, result.totalDocs),
              total: result.totalDocs,
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
