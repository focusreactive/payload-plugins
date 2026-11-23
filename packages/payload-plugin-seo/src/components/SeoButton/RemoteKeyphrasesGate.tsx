"use client";

import { useConfig, usePayloadAPI } from "@payloadcms/ui";
import { KEYPHRASES_ENDPOINT_PATH } from "../../constants";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import { SeoButtonInner } from "./SeoButtonInner";
import { SeoTriggerButton } from "./SeoTriggerButton";
import type { SeoButtonProps } from "./SeoButtonInner";

interface RemoteKeyphrasesGateProps extends SeoButtonProps {
  docId: string;
}

interface KeyphrasesResponse {
  keyphrases: StoredKeyphrase[];
  indexed: boolean;
  canUpdate: boolean;
}

export function RemoteKeyphrasesGate({ docId, ...props }: RemoteKeyphrasesGateProps) {
  const { config } = useConfig();
  const apiRoute = config.routes.api;

  const [{ data, isLoading, isError }] = usePayloadAPI(`${apiRoute}${KEYPHRASES_ENDPOINT_PATH}`, {
    initialParams: { collection: props.collectionSlug, docId },
  });

  if (isLoading) return <SeoTriggerButton loading />;
  if (isError) return <SeoButtonInner {...props} />;

  const { keyphrases, indexed, canUpdate } = data as KeyphrasesResponse;

  return (
    <SeoButtonInner {...props} remote={{ apiRoute, initial: keyphrases, indexed, canUpdate }} />
  );
}
