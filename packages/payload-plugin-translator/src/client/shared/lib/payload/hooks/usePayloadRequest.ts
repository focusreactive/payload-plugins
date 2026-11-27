import { useConfig } from "@payloadcms/ui";
import { useMemo } from "react";

import { createRequest } from "../../../api/createRequest.js";
import type { ApiRequest } from "../../../api/createRequest.js";

/** Payload's own REST, relative for the same reason as `useApiBase`. */
export function usePayloadRequest(): ApiRequest {
  const { config } = useConfig();
  const baseURL = config.routes.api;
  return useMemo(() => createRequest({ baseURL }), [baseURL]);
}
