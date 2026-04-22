"use client";

import { useState } from "react";
import {
  Button,
  ConfirmationModal,
  EditIcon,
  useDocumentDrawer,
  useModal,
  toast,
  Link,
} from "@payloadcms/ui";
import { useRouter } from "next/navigation";

interface RollbackEntry {
  collection: string;
  docId: string;
  action: string;
  previousState: Record<string, unknown> | null;
}

interface PreviewResult {
  eligible: RollbackEntry[];
  skipped: RollbackEntry[];
}

interface RollbackButtonProps {
  id: string;
  status: string;
}

function getButtonProps(status: string): {
  disabled: boolean;
  tooltip?: string;
} {
  switch (status) {
    case "reverting":
      return {
        disabled: true,
        tooltip: "Release is currently being reverted",
      };
    case "reverted":
      return {
        disabled: true,
        tooltip: "This release has already been reverted",
      };
    default:
      return {
        disabled: false,
      };
  }
}

export function getDocTitle(entry: RollbackEntry) {
  return (
    (entry.previousState?.title as string | undefined) ??
    (entry.previousState?.name as string | undefined) ??
    entry.docId
  );
}

export function getActionLabel(entry: RollbackEntry) {
  if (entry.action === "unpublish") return "Republish";

  return entry.previousState === null ? "Delete" : "Unpublish";
}

function toPascalCase(str: string) {
  return str
    .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (c: string) => c.toUpperCase());
}

function DocDrawerCell({ entry }: { entry: RollbackEntry }) {
  const [DocumentDrawer, DocumentDrawerToggler] = useDocumentDrawer({
    collectionSlug: entry.collection,
    id: entry.docId,
  });

  return (
    <>
      <div className="cell-targetCollection">
        <div className="drawer-link">
          <span className="drawer-link__cell">{getDocTitle(entry)}</span>

          <DocumentDrawerToggler className="drawer-link__doc-drawer-toggler">
            <EditIcon />
          </DocumentDrawerToggler>
        </div>
      </div>

      <DocumentDrawer />
    </>
  );
}

function RollbackPreviewBody({
  previewResult,
}: {
  previewResult: PreviewResult;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "18px" }}>
          Will be reverted ({previewResult.eligible.length})
        </h3>

        {previewResult.eligible.length > 0 ? (
          <div
            className="table table--appearance-condensed"
            style={{ marginBottom: 0 }}
          >
            <table>
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Document</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {previewResult.eligible.map((entry) => (
                  <tr key={`${entry.collection}-${entry.docId}`}>
                    <td>{toPascalCase(entry.collection)}</td>
                    <td>
                      <DocDrawerCell entry={entry} />
                    </td>
                    <td>{getActionLabel(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No documents will be reverted.</p>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "18px" }}>
          Will be skipped ({previewResult.skipped.length})
        </h3>
        {previewResult.skipped.length > 0 ? (
          <>
            <p
              style={{
                marginBottom: "0.5rem",
                color: "var(--theme-elevation-400)",
              }}
            >
              These documents were modified after this release was published and
              will not be reverted.
            </p>
            <div
              className="table table--appearance-condensed"
              style={{ marginBottom: 0 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Document</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.skipped.map((entry) => (
                    <tr key={`${entry.collection}-${entry.docId}`}>
                      <td>{toPascalCase(entry.collection)}</td>
                      <td>
                        <DocDrawerCell entry={entry} />
                      </td>
                      <td>Modified after release</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>No documents will be skipped.</p>
        )}
      </section>
    </div>
  );
}

export function RollbackButton({ id, status }: RollbackButtonProps) {
  const router = useRouter();
  const { openModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null,
  );

  const modalSlug = `rollback-confirm-${id}`;
  const { disabled, tooltip } = getButtonProps(status);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-releases/${id}/rollback`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to preview rollback");
        return;
      }
      if (data.eligible.length === 0 && data.skipped.length === 0) {
        toast.error("Nothing to roll back");
        return;
      }
      setPreviewResult(data);
      openModal(modalSlug);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to preview rollback",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await fetch(`/api/content-releases/${id}/rollback`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Rollback failed");
        return;
      }
      toast.success("Release rolled back");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rollback failed");
    }
  };

  return (
    <>
      <Button
        size="medium"
        buttonStyle="secondary"
        onClick={handleClick}
        disabled={disabled || loading}
        tooltip={tooltip}
      >
        {loading ? "Loading…" : "Rollback"}
      </Button>

      <ConfirmationModal
        modalSlug={modalSlug}
        heading="Confirm Rollback"
        className=""
        body={
          previewResult ? (
            <RollbackPreviewBody previewResult={previewResult} />
          ) : null
        }
        confirmLabel="Confirm Rollback"
        confirmingLabel="Reverting…"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
      />
    </>
  );
}
