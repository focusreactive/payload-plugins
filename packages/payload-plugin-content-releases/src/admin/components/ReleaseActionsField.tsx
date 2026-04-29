"use client";

import { useState } from "react";
import { Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { ReleaseStatus } from "../../types";
import { isValidTransition } from "../../validation/statusTransitions";
import { getPublishButtonProps } from "./getPublishButtonProps";
import { RollbackButton } from "./RollbackButton";

export function ReleaseActionsField() {
  const { id, data } = useDocumentInfo();
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!id) return null;

  const status = data?.status as ReleaseStatus;
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
  );
}
