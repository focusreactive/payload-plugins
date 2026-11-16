"use client";

import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

// Instant preview shows typing; the saved render still comes from a refresh after each save.
export const RefreshOnSave = () => {
  const router = useRouter();
  const adminOrigin = typeof window === "undefined" ? "" : window.location.origin;
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={adminOrigin} />;
};
