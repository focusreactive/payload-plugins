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
import { operationsText, waitingOnText } from "../shared/format.js";
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

/**
 * An active run in the workflow drawer, in the order a person reads it: where it is and what it
 * waits on, what holds the document, what to do now, what happened, and abort last.
 */
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
  const abortSlug = formatDrawerSlug({ slug: `workflow-abort-${key}`, depth });

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
  // A stage with plain `actions` has one activity named after it: no heading of its own.
  const implicit = view.activities.length === 1 && view.activities[0]?.name === view.stage.name;

  return (
    <section
      aria-labelledby={`${idPrefix}-title`}
      className="workflows-run"
      data-status={view.stuck ? "stuck" : view.status}
    >
      <div className="workflows-run__header">
        <h3 className="workflows-run__title" id={`${idPrefix}-title`}>
          {view.title}
        </h3>
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
          <div className="workflows-run__status">
            <p className="workflows-run__waiting">
              {waiting ? t("waitingOn", { who: waiting }) : t("waitingOnAnyone")}
            </p>
            {view.stage.description ? (
              <p className="workflows-run__meta">{view.stage.description}</p>
            ) : null}
          </div>
          {view.guards.map((guard) => (
            <div className="workflows-notice" data-tone="warning" key={guard.name} role="note">
              <strong className="workflows-notice__title">{guard.title}</strong>
              <span className="workflows-notice__body">
                {t("guardHolds", { operations: operationsText(guard.operations, t) })}
              </span>
            </div>
          ))}
          <ul className="workflows-run__activities">
            {view.activities.map((activity) => (
              <ActivityItem
                activity={activity}
                busy={busy}
                idPrefix={idPrefix}
                implicit={implicit}
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
      <HistoryList people={people} view={view} />
      {view.canAbort ? (
        <div className="workflows-run__footer">
          <Button
            buttonStyle="none"
            className="workflows-run__abort"
            disabled={busy}
            margin={false}
            onClick={() => openModal(abortSlug)}
            size="small"
          >
            {t("abort")}
          </Button>
        </div>
      ) : null}
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
