"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { AnalyticsProvider } from "../../types/provider";
import { getPagePath } from "../../utils/page/getPagePath";

interface RouteChangeTrackerProps {
  provider: AnalyticsProvider;
}

export function RouteChangeTracker({ provider }: RouteChangeTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastFiredPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastFiredPath.current === pathname) return;

    const search = searchParams?.toString() ?? "";
    const path = getPagePath(pathname ?? "", search);

    provider.pageView(path);
    lastFiredPath.current = pathname;
  }, [pathname, searchParams, provider]);

  return null;
}
