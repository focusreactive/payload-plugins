"use client";

import { Pill, useField } from "@payloadcms/ui";
import type { ReleaseItemStatus } from "../../types";

const PILL_STYLE_BY_STATUS: Record<ReleaseItemStatus, string> = {
  pending: "light-gray",
  published: "success",
  failed: "error",
  skipped: "light",
  reverted: "dark",
};

function formatLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface ReleaseItemStatusFieldProps {
  path: string;
  label?: string;
}

export function ReleaseItemStatusField({ path, label }: ReleaseItemStatusFieldProps) {
  const { value } = useField<string>({ path });
  const status = (value ?? "pending") as ReleaseItemStatus;
  const pillStyle = PILL_STYLE_BY_STATUS[status] ?? "light-gray";

  return (
    <div className="field-type">
      <label className="field-label">{label ?? "Status"}</label>
      <div style={{ marginTop: 4 }}>
        <Pill pillStyle={pillStyle as any}>{formatLabel(status)}</Pill>
      </div>
    </div>
  );
}
