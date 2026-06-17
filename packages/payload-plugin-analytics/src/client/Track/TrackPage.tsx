"use client";

import { useEffect } from "react";
import { useAnalyticsProvider } from "../hooks/useAnalytics";
import { setPageContext } from "../pageContext/store";
import { formatPageRef } from "../../utils/page/formatPageRef";
import { getPagePath } from "../../utils/page/getPagePath";

type TrackPageProps = {
  locale: string;
  path?: string;
  enabled?: boolean;
} & ({ pageRef: string; collection?: never; id?: never } | { collection: string; id: string | number; pageRef?: never });

export function TrackPage(props: TrackPageProps) {
  const { locale, path, enabled = true } = props;
  const provider = useAnalyticsProvider();
  const pageRef = props.pageRef === undefined ? formatPageRef(props.collection, props.id) : props.pageRef;

  useEffect(() => {
    if (!enabled) return;

    const resolvedPath = path ?? (typeof window === "undefined" ? "" : getPagePath(window.location.pathname, window.location.search));

    setPageContext({ pageRef, locale });
    provider.pageView(resolvedPath);
  }, [enabled, pageRef, locale, path, provider]);

  return null;
}
