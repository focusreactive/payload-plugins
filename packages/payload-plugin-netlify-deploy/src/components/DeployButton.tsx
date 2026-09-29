"use client";

import {
  Button,
  ConfirmationModal,
  Drawer,
  toast,
  useDocumentEvents,
  useDocumentInfo,
  useDrawerSlug,
  useFormModified,
  useModal,
} from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import { DeployPanel, GREEN_BUTTON, GREY_BUTTON, TONES } from "./DeployPanel.js";
import type { DeployView } from "./DeployPanel.js";
import { useDeploy } from "./useDeploy.js";

const LABELS: Record<DeployView, string> = {
  idle: "Publish",
  starting: "Building…",
  queued: "In queue…",
  building: "Building…",
  ready: "Preview ready",
  failed: "Build failed",
  publishing: "Publishing…",
};

type Props = { placement?: "document" | "header" };

// The Publish button — beside Save on a document, or in the admin's top bar — and the drawer it opens.
export const DeployButton = ({ placement = "document" }: Props) => {
  const info = useDocumentInfo();
  const { mostRecentUpdate } = useDocumentEvents();
  const unsaved = useFormModified();
  const { openModal, closeModal, isModalOpen } = useModal();
  const drawerSlug = useDrawerSlug("netlify-deploy");
  const confirmSlug = useDrawerSlug("netlify-deploy-confirm");
  const onDocument = placement === "document";
  const id = onDocument ? (info.id ?? null) : null;

  const { status, log, pending, error, build, discard, publish } = useDeploy({
    collection: onDocument ? (info.collectionSlug ?? null) : null,
    id,
    open: isModalOpen(drawerSlug),
    refreshKey: `${info.lastUpdateTime ?? ""}:${mostRecentUpdate?.updatedAt ?? ""}`,
  });

  // A build outlives the drawer: its end is announced wherever the editor is.
  const previous = useRef<{ phase?: string; publishedAt?: string | null }>({});
  useEffect(() => {
    if (!status) {
      return;
    }
    const before = previous.current;
    previous.current = { phase: status.phase, publishedAt: status.lastPublishedAt };
    if (!before.phase) {
      return;
    }
    const host = new URL(status.site.url).host;
    if (before.phase !== status.phase && status.phase === "ready") {
      toast.success(`The preview of ${host} is ready`);
    }
    if (before.phase !== status.phase && status.phase === "failed") {
      toast.error(`The build of ${host} failed`);
    }
    if (
      before.publishedAt &&
      status.lastPublishedAt &&
      before.publishedAt !== status.lastPublishedAt
    ) {
      toast.success(`${host} is live`);
    }
  }, [status]);

  if ((onDocument && id === null) || !status) {
    return null;
  }

  const host = new URL(status.site.url).host;
  const current = status.current;
  let view: DeployView = status.phase;
  if (pending === "build") {
    view = "starting";
  } else if (pending === "publish") {
    view = "publishing";
  }
  // The button's fill says what the next step is: green to start publishing, grey while a build
  // runs, white (the theme's primary) once a preview waits. A failed build keeps the outline and a
  // red dot.
  const busy =
    view === "starting" || view === "queued" || view === "building" || view === "publishing";
  const look =
    view === "idle"
      ? { buttonStyle: "primary" as const, style: GREEN_BUTTON }
      : busy
        ? { buttonStyle: "primary" as const, style: GREY_BUTTON }
        : view === "ready"
          ? { buttonStyle: "primary" as const, style: undefined }
          : { buttonStyle: "secondary" as const, style: undefined };
  const waiting = view === "idle" ? status.changes.length : 0;

  // Cancel means nothing goes live: the build is stopped or its preview deleted, and the drawer
  // closes on the Publish button again.
  const cancel = async () => {
    closeModal(drawerSlug);
    if (current) {
      await discard(current.id);
    }
  };

  return (
    <>
      <Button
        buttonStyle={look.buttonStyle}
        extraButtonProps={look.style ? { style: look.style } : undefined}
        margin={false}
        onClick={() => openModal(drawerSlug)}
        size={onDocument ? "medium" : "small"}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {view === "failed" && (
            <span
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: "50%", background: TONES.failed }}
            />
          )}
          {LABELS[view]}
          {waiting > 0 && (
            <span
              aria-label={`${waiting} unpublished changes`}
              style={{
                padding: "0 7px",
                borderRadius: 999,
                // Shown only on the green button, so it is tinted from the button, not the theme.
                background: "rgba(255, 255, 255, 0.25)",
                fontSize: 12,
                lineHeight: "18px",
              }}
            >
              {waiting}
            </span>
          )}
        </span>
      </Button>
      <Drawer slug={drawerSlug} title="Publish site">
        <DeployPanel
          error={error}
          log={log}
          onBuild={build}
          onCancel={cancel}
          onPublish={() => openModal(confirmSlug)}
          pending={pending}
          status={status}
          unsaved={onDocument && unsaved}
          view={view}
        />
      </Drawer>
      <ConfirmationModal
        body={`${status.note ? `${status.note} ` : ""}The preview replaces what is live at ${host}.`}
        confirmLabel="Publish"
        heading={`Publish ${host}?`}
        modalSlug={confirmSlug}
        onConfirm={async () => {
          if (current) {
            await publish(current.id);
          }
        }}
      />
    </>
  );
};
