import { useLocale } from "@payloadcms/ui";
import { useQuery } from "@tanstack/react-query";
import type { Where } from "payload";

import { viewIdsKey } from "../../../entities/translation/index.js";
import { findMatchingIds } from "../../../shared/api/findMatchingIds.js";
import { usePayloadRequest } from "../../../shared/lib/payload/hooks/usePayloadRequest.js";

/** Every id the list's search and filters match, across all its pages; read only while `wanted`. */
export function useViewIds(collection: string, where: Where, wanted: boolean) {
  const request = usePayloadRequest();
  const { code: locale } = useLocale();
  return useQuery({
    queryKey: viewIdsKey(collection, locale, JSON.stringify(where)),
    queryFn: () => findMatchingIds(request, { collection, where, locale }),
    enabled: wanted,
  });
}
