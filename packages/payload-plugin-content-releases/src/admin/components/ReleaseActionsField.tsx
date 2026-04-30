"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner, Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { ReleaseStatus } from "../../types";
import { isValidTransition } from "../../validation/statusTransitions";
import { getPublishButtonProps } from "./getPublishButtonProps";
import { RollbackButton } from "./RollbackButton";

interface FailedItem {
  id: string;
  targetCollection: string;
  targetDoc: string;
}

export function ReleaseActionsField() {
  const { id, data } = useDocumentInfo();
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [refreshingItem, setRefreshingItem] = useState<string | null>(null);

  const status = data?.status as ReleaseStatus;

  const fetchFailedItems = useCallback(async () => {
    if (!id) return;
    if (status !== "failed") {
      setFailedItems([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/release-items?where[release][equals]=${id}&where[status][equals]=failed&limit=100&depth=0`,
      );
      if (!res.ok) return;
      const json = await res.json();
      setFailedItems(
        (json.docs ?? []).map((d: any) => ({
          id: String(d.id),
          targetCollection: d.targetCollection,
          targetDoc: String(d.targetDoc),
        })),
      );
    } catch {
      // non-fatal
    }
  }, [id, status]);

  useEffect(() => {
    void fetchFailedItems();
  }, [fetchFailedItems]);

  if (!id) return null;

  const { disabled, tooltip } = getPublishButtonProps(status);
  const canResetToDraft = !!status && isValidTransition(status, "draft");

  const handlePublish = async () => {
    setPublishing(true);

    try {
      const res = await fetch(`/api/content-releases/${id}/publish`, {
        method: "POST",
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result?.error ?? "Publish failed");
        return;
      }

      toast.success("Release published");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleRefreshItem = async (itemId: string) => {
    setRefreshingItem(itemId);
    try {
      const res = await fetch(
        `/api/content-releases/items/${itemId}/refresh-snapshot`,
        { method: "POST" },
      );
      const result = await res.json();
      if (!res.ok) {
        toast.error(result?.error ?? "Failed to refresh snapshot");
        return;
      }
      toast.success("Snapshot refreshed");
      router.refresh();
      void fetchFailedItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh snapshot");
    } finally {
      setRefreshingItem(null);
    }
  };

  const handleResetToDraft = async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/releases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      const result = await res.json();
      if (!res.ok) {
        const errMsg =
          result?.errors?.[0]?.message ?? result?.message ?? "Reset failed";
        toast.error(errMsg);
        return;
      }
      toast.success("Release reset to draft");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {status === "failed" && failedItems.length > 0 && (
        <Banner type="error">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <strong>
                {failedItems.length} item{failedItems.length === 1 ? "" : "s"} failed to publish.
              </strong>{" "}
              Usually this means the document was modified after the snapshot
              was staged. Refresh the snapshot to use the document&rsquo;s
              current state, then reset to draft and republish.
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {failedItems.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {item.targetCollection} / {item.targetDoc}
                  </span>
                  <Button
                    size="small"
                    buttonStyle="secondary"
                    margin={false}
                    onClick={() => handleRefreshItem(item.id)}
                    disabled={refreshingItem === item.id}
                  >
                    {refreshingItem === item.id ? "Refreshing…" : "Refresh snapshot"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Banner>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          size="medium"
          buttonStyle="primary"
          onClick={handlePublish}
          disabled={disabled || publishing}
          tooltip={tooltip}
        >
          {publishing ? "Publishing…" : "Publish Now"}
        </Button>
        {canResetToDraft && (
          <Button
            size="medium"
            buttonStyle="secondary"
            onClick={handleResetToDraft}
            disabled={resetting}
            tooltip={
              status === "reverted"
                ? "Reuse this release as a fresh draft"
                : "Reset back to draft so you can edit and retry"
            }
          >
            {resetting ? "Resetting…" : "Reset to draft"}
          </Button>
        )}
        {status === "published" && <RollbackButton id={String(id)} status={status} />}
      </div>
    </div>
  );
}
