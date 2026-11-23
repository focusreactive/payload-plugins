"use client";

import "./WorkflowsView.css";

import { Button, Pagination, SelectInput, SetStepNav, toast } from "@payloadcms/ui";
import { useEffect, useState } from "react";

import { ENDPOINTS } from "../../constants.js";
import type { DefinitionSummary, InstanceSummary } from "../../server/queries.js";
import { usePeople, useWorkflowsApi } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { RunsBoard } from "./RunsBoard.js";
import { RunsTable } from "./RunsTable.js";

type Scope = "mine" | "all";

interface Page {
  docs: InstanceSummary[];
  totalDocs: number;
  page: number;
  totalPages: number;
}

const LIST_LIMIT = 20;
const BOARD_LIMIT = 100;

/** The inbox at `/admin/workflows`: runs waiting on me, or every open run; a board per workflow. */
export const WorkflowsView = () => {
  const { t } = useWorkflowsT();
  const api = useWorkflowsApi();
  const [scope, setScope] = useState<Scope>("mine");
  const [workflow, setWorkflow] = useState<string>("");
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

  const board = definitions.find((def) => def.name === workflow);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    const load = async () => {
      try {
        const body = await api<Page>(ENDPOINTS.instances, {
          query: {
            scope,
            status: "active",
            workflow: workflow || undefined,
            page,
            limit: workflow ? BOARD_LIMIT : LIST_LIMIT,
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
  }, [api, scope, workflow, page]);

  const choose = (next: Scope) => {
    setScope(next);
    setPage(1);
  };
  const tabs: { scope: Scope; label: string }[] = [
    { scope: "mine", label: t("tabMine") },
    { scope: "all", label: t("tabAll") },
  ];

  return (
    <div className="workflows-view">
      <SetStepNav nav={[{ label: t("viewTitle") }]} />
      <header className="workflows-view__header">
        <h1 className="workflows-view__title">{t("viewTitle")}</h1>
        <p className="workflows-view__description">{t("viewDescription")}</p>
      </header>
      <div className="workflows-view__controls">
        <div className="workflows-view__tabs">
          {tabs.map((tab) => (
            <Button
              buttonStyle="tab"
              className="workflows-view__tab"
              extraButtonProps={{
                "aria-pressed": scope === tab.scope,
                "data-active": scope === tab.scope,
              }}
              key={tab.scope}
              margin={false}
              onClick={() => choose(tab.scope)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="workflows-view__filter">
          <SelectInput
            isClearable
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
            value={workflow || undefined}
          />
        </div>
      </div>
      {result === null ? (
        <p className="workflows-view__status">{t("loading")}</p>
      ) : result.docs.length === 0 && !board ? (
        <div className="workflows-view__empty">
          <p className="workflows-view__empty-title">
            {scope === "mine" ? t("emptyMineTitle") : t("emptyAllTitle")}
          </p>
          <p className="workflows-view__empty-body">
            {scope === "mine" ? t("emptyMineBody") : t("emptyAllBody")}
          </p>
          {scope === "mine" ? (
            <Button
              buttonStyle="secondary"
              margin={false}
              onClick={() => choose("all")}
              size="small"
            >
              {t("emptyMineAction")}
            </Button>
          ) : null}
        </div>
      ) : board ? (
        <RunsBoard definition={board} people={people} runs={result.docs} />
      ) : (
        <RunsTable people={people} runs={result.docs} />
      )}
      {result && result.totalPages > 1 ? (
        <div className="workflows-view__pagination">
          <Pagination
            hasNextPage={result.page < result.totalPages}
            hasPrevPage={result.page > 1}
            nextPage={result.page + 1}
            onChange={setPage}
            page={result.page}
            prevPage={result.page - 1}
            totalPages={result.totalPages}
          />
        </div>
      ) : null}
    </div>
  );
};
