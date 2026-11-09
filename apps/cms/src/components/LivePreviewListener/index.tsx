"use client";

import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { getClientSideURL } from "@/lib/utils/getURL";

export const LivePreviewListener: React.FC = () => {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshRequests, setRefreshRequests] = useState(0);
  const handledRefreshRequestsRef = useRef(0);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (isRefreshing || refreshRequests === handledRefreshRequestsRef.current) return;
    handledRefreshRequestsRef.current = refreshRequests;
    startRefresh(() => router.refresh());
  }, [isRefreshing, refreshRequests, router]);

  const requestRefreshAfterMount = useCallback(() => {
    if (hasMountedRef.current) setRefreshRequests((count) => count + 1);
  }, []);

  return <PayloadLivePreview refresh={requestRefreshAfterMount} serverURL={getClientSideURL()} />;
};
