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
import { useEffect, useRef, useState } from "react";

import { DeployPanel, TONES } from "./DeployPanel.js";
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

// A discarded preview stays a finished, unpublished deploy on Netlify; the admin just stops
// offering it. Remembered per browser, which is all that decision is.
const dismissedKey = (site: string) => `payload-netlify-deploy:dismissed:${site}`;

const readDismissed = (site: string) => {
  try {
    return window.localStorage.getItem(dismissedKey(site));
  } catch {
    return null;
  }
};

type Props = { placement?: "document" | "header" };

// The Publish button — beside Save on a document, or in the admin's top bar — and the drawer it opens.
export const DeployButton = ({ placement = "document" }: Props) => {
  const info = useDocumentInfo();
  const { mostRecentUpdate } = useDocumentEvents();
  const unsaved = useFormModified();
  const { openModal, isModalOpen } = useModal();
  const drawerSlug = useDrawerSlug("netlify-deploy");
  const confirmSlug = useDrawerSlug("netlify-deploy-confirm");
  const onDocument = placement === "document";
  const id = onDocument ? (info.id ?? null) : null;

  const { status, log, pending, error, build, cancel, publish } = useDeploy({
    collection: onDocument ? (info.collectionSlug ?? null) : null,
    id,
    open: isModalOpen(drawerSlug),
    refreshKey: `${info.lastUpdateTime ?? ""}:${mostRecentUpdate?.updatedAt ?? ""}`,
  });

  const [dismissed, setDismissed] = useState<string | null>(null);
  const siteName = status?.site.name;
  useEffect(() => {
    if (siteName) {
      setDismissed(readDismissed(siteName));
    }
  }, [siteName]);

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
  } else if (status.phase === "ready" && current?.id === dismissed) {
    view = "idle";
  }
  const tone = {
    idle: TONES.live,
    starting: TONES.busy,
    queued: TONES.busy,
    building: TONES.busy,
    publishing: TONES.busy,
    ready: TONES.ready,
    failed: TONES.failed,
  }[view];
  const waiting = view === "idle" ? status.changes.length : 0;

  const discard = () => {
    if (!current) {
      return;
    }
    try {
      window.localStorage.setItem(dismissedKey(status.site.name), current.id);
    } catch {
      // Private mode: the preview is offered again on the next load, which is harmless.
    }
    setDismissed(current.id);
  };

  return (
    <>
      <Button
        buttonStyle="secondary"
        margin={false}
        onClick={() => openModal(drawerSlug)}
        size={onDocument ? "medium" : "small"}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: "50%", background: tone }}
          />
          {LABELS[view]}
          {waiting > 0 && (
            <span
              aria-label={`${waiting} unpublished changes`}
              style={{
                padding: "0 7px",
                borderRadius: 999,
                background: "var(--theme-elevation-150)",
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
          onCancel={() => {
            if (current) {
              cancel(current.id);
            }
          }}
          onDiscard={discard}
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
