"use client";

import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import type React from "react";

import { getClientSideURL } from "@/lib/utils/getURL";

import { useCoalescedRouterRefresh } from "./useCoalescedRouterRefresh";

export const LivePreviewListener: React.FC = () => {
  const requestRefresh = useCoalescedRouterRefresh();

  return <PayloadLivePreview refresh={requestRefresh} serverURL={getClientSideURL()} />;
};
