"use client";

import { useState } from "react";
import { Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { ReleaseStatus } from "../../types";

function getButtonProps(status?: ReleaseStatus): {
  disabled: boolean;
  tooltip?: string;
} {
  switch (status) {
    case "publishing":
      return {
        disabled: true,
        tooltip: "Release is currently being published",
      };
    case "published":
      return {
        disabled: true,
        tooltip: "This release has already been published",
      };
    case "failed":
      return {
        disabled: true,
        tooltip: "Release failed to publish",
      };
    default:
      return {
        disabled: false,
      };
  }
}

export function ReleaseActionsField() {
  const { id, data } = useDocumentInfo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!id) return null;

  const status = data?.status as ReleaseStatus;
  console.log(status, data);
  const { disabled, tooltip } = getButtonProps(status);

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
    <div style={{ display: "flex", alignItems: "center" }}>
      <Button
        size="medium"
        buttonStyle="primary"
        onClick={handlePublish}
        disabled={disabled || loading}
        tooltip={tooltip}
      >
        {loading ? "Publishing…" : "Publish Now"}
      </Button>
    </div>
  );
}
