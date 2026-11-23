import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function useCoalescedRouterRefresh() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshRequests, setRefreshRequests] = useState(0);
  const handledRefreshRequestsRef = useRef(0);

  useEffect(() => {
    if (isRefreshing || refreshRequests === handledRefreshRequestsRef.current) return;
    handledRefreshRequestsRef.current = refreshRequests;
    startRefresh(() => router.refresh());
  }, [isRefreshing, refreshRequests, router]);

  return () => setRefreshRequests((count) => count + 1);
}
