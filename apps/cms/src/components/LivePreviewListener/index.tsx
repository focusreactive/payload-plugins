"use client";

import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
// import { useTranslations } from "next-intl";
// import { useRouter, usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { getClientSideURL } from "@/lib/utils/getURL";

export const LivePreviewListener: React.FC = () => {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [requested, setRequested] = useState(0);
  const handledRef = useRef(0);
  const mountedRef = useRef(false);

  // Child effects run first, so this is still false while RefreshRouteOnSave mounts.
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // One refresh at a time: saves that land during a refresh collapse into one refresh after it.
  useEffect(() => {
    if (isRefreshing || requested === handledRef.current) return;
    handledRef.current = requested;
    startRefresh(() => router.refresh());
  }, [isRefreshing, requested, router]);

  // RefreshRouteOnSave also refreshes on mount, but the page has just rendered the latest draft,
  // and the admin sends a document event as soon as the preview reports ready.
  const requestRefresh = useCallback(() => {
    if (mountedRef.current) setRequested((count) => count + 1);
  }, []);

  // --- Exit Preview button logic (disabled) ---
  // const pathname = usePathname();
  // const [isInIframe, setIsInIframe] = useState(false);
  // const [isFromPayloadAdmin, setIsFromPayloadAdmin] = useState(false);
  // const t = useTranslations("common");
  //
  // useEffect(() => {
  //   const checkIframe = () => {
  //     try {
  //       const inIframe = window.self !== window.top;
  //       setIsInIframe(inIframe);
  //
  //       if (inIframe) {
  //         let isAdmin = false;
  //
  //         try {
  //           const parentLocation = window.parent.location;
  //           const parentPath = parentLocation.pathname || "";
  //           isAdmin = parentPath.includes("/admin");
  //         } catch {
  //           const referrer = document.referrer || "";
  //           isAdmin =
  //             referrer.includes("/admin") ||
  //             referrer.includes("payload") ||
  //             window.location.search.includes("preview=true");
  //         }
  //
  //         setIsFromPayloadAdmin(isAdmin);
  //       }
  //     } catch {
  //       setIsInIframe(false);
  //       setIsFromPayloadAdmin(false);
  //     }
  //   };
  //
  //   checkIframe();
  // }, []);
  //
  // const exitPreviewUrl = `/next/exit-preview?path=${encodeURIComponent(pathname)}`;

  return (
    <>
      <PayloadLivePreview refresh={requestRefresh} serverURL={getClientSideURL()} />
      {/* Exit Preview button (disabled) */}
      {/* {(!isInIframe || !isFromPayloadAdmin) && (
        <div className="fixed bottom-4 right-4 z-50">
          <a
            href={exitPreviewUrl}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-lg transition-colors"
          >
            {t("exitPreview")}
          </a>
        </div>
      )} */}
    </>
  );
};
