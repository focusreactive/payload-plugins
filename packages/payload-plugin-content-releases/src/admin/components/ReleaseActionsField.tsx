"use client";

import { useState } from "react";
import { Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { ReleaseStatus } from "../../types";
import { getPublishButtonProps } from "./getPublishButtonProps";
import { RollbackButton } from "./RollbackButton";

export function ReleaseActionsField() {
  const { id, data } = useDocumentInfo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!id) return null;

  const status = data?.status as ReleaseStatus;
  const { disabled, tooltip } = getPublishButtonProps(status);

  const handlePublish = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/content-releases/${id}/publish`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Publish failed");
        return;
      }

      toast.success("Release published");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Button
        size="medium"
        buttonStyle="primary"
        onClick={handlePublish}
        disabled={disabled || loading}
        tooltip={tooltip}
      >
        {loading ? "Publishing…" : "Publish Now"}
      </Button>
      {status === "published" && <RollbackButton id={String(id)} status={status} />}
    </div>
  );
}
