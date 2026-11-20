"use client";

import {
  Button,
  ConfirmationModal,
  Drawer,
  Pill,
  formatDrawerSlug,
  useEditDepth,
  useModal,
} from "@payloadcms/ui";
import { useId, useState } from "react";

import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";
import { waitingOnText } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { ActivityItem } from "./ActivityItem.js";
import { HistoryList } from "./HistoryList.js";
import { ParamForm } from "./ParamForm.js";
import { StageStepper } from "./StageStepper.js";

interface Props {
  view: InstanceView;
  people: People;
  busy: boolean;
  onFire: (activity: string, action: string, params?: Record<string, unknown>) => Promise<void>;
  onAbort: () => Promise<void>;
}

/** An active run: stepper, guard notices, the current stage's activities, history, abort. */
export const ActiveRun = ({ view, people, busy, onFire, onAbort }: Props) => {
  const { t } = useWorkflowsT();
  const { openModal, closeModal } = useModal();
  const depth = useEditDepth();
  const idPrefix = useId();
  const [pending, setPending] = useState<{ activity: ViewActivity; action: ViewAction } | null>(
    null
  );
  const key = (view.id ?? view.workflow).replace(/[^a-zA-Z0-9-]/gu, "");
  const paramsSlug = formatDrawerSlug({ slug: `workflow-params-${key}`, depth });
  const abortSlug = `workflow-abort-${key}`;

  const act = (activity: ViewActivity, action: ViewAction) => {
    if (action.params.length > 0) {
      setPending({ activity, action });
      openModal(paramsSlug);
      return;
    }
    void onFire(activity.name, action.name);
  };

  const primary = view.activities
    .flatMap((activity) =>
      activity.status === "active"
        ? activity.actions
            .filter((action) => action.allowed)
            .map((action) => `${activity.name}/${action.name}`)
        : []
    )
    .at(0);
  const waiting = waitingOnText(view.waitingOn, people, t);
  const operations: Record<string, string> = {
    publish: t("operationPublish"),
    update: t("operationUpdate"),
    delete: t("operationDelete"),
  };

  return (
    <section
      aria-label={view.title}
      className="workflows-run"
      data-status={view.stuck ? "stuck" : view.status}
    >
      <div className="workflows-run__header">
        <span className="workflows-run__title">{view.title}</span>
        {view.stuck ? (
          <StatusPill status="stuck" />
        ) : (
          <Pill className="workflows-pill" pillStyle="light" size="small">
            {view.stage.title}
          </Pill>
        )}
      </div>
      <StageStepper stages={view.stages} />
      {view.stuck ? (
        <p className="workflows-notice" data-tone="error" role="note">
          {t("stuck", { stage: view.stage.name })}
        </p>
      ) : (
        <>
          {view.stage.description ? (
            <p className="workflows-run__meta">{view.stage.description}</p>
          ) : null}
          {view.guards.map((guard) => (
            <div className="workflows-notice" data-tone="warning" key={guard.name} role="note">
              <strong className="workflows-notice__title">{guard.title}</strong>
              <span className="workflows-notice__body">
                {t("guardHolds", {
                  operations: guard.operations.map((op) => operations[op] ?? op).join(", "),
                })}
              </span>
            </div>
          ))}
          <p className="workflows-run__meta">
            {waiting ? t("waitingOn", { who: waiting }) : t("waitingOnAnyone")}
          </p>
          <ul className="workflows-run__activities">
            {view.activities.map((activity) => (
              <ActivityItem
                activity={activity}
                busy={busy}
                idPrefix={idPrefix}
                key={activity.name}
                onAction={act}
                people={people}
                primary={primary}
                showWaiting={view.activities.length > 1}
              />
            ))}
          </ul>
        </>
      )}
      <div className="workflows-run__footer">
        <HistoryList people={people} view={view} />
        {view.canAbort ? (
          <Button
            buttonStyle="subtle"
            className="workflows-run__abort"
            disabled={busy}
            margin={false}
            onClick={() => openModal(abortSlug)}
            size="small"
          >
            {t("abort")}
          </Button>
        ) : null}
      </div>
      {view.canAbort ? (
        <ConfirmationModal
          body={t("abortBody", { stage: view.stage.title })}
          cancelLabel={t("cancel")}
          confirmingLabel={t("aborting")}
          confirmLabel={t("abortConfirm")}
          heading={t("abortHeading", { title: view.title })}
          modalSlug={abortSlug}
          onConfirm={onAbort}
        />
      ) : null}
      <Drawer slug={paramsSlug} title={pending?.action.title ?? ""}>
        {pending ? (
          <ParamForm
            defs={pending.action.params}
            key={`${pending.activity.name}/${pending.action.name}`}
            onCancel={() => {
              closeModal(paramsSlug);
              setPending(null);
            }}
            onSubmit={(params) => {
              closeModal(paramsSlug);
              setPending(null);
              void onFire(pending.activity.name, pending.action.name, params);
            }}
            submitLabel={pending.action.title}
          />
        ) : null}
      </Drawer>
    </section>
  );
};
