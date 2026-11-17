"use client";

import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

export const RefreshOnSave = () => {
  const router = useRouter();
  const adminOrigin = typeof window === "undefined" ? "" : window.location.origin;
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={adminOrigin} />;
};
