import type { Endpoint } from "payload";

import { RUN_ENDPOINT } from "../constants";
import { createSchedulePublicationHandler } from "../handler";

export function overrideEndpoints(
  configEndpoints: Endpoint[] | undefined,
  secret: string,
  queue: string
): Endpoint[] {
  return [
    ...(configEndpoints ?? []),
    {
      handler: createSchedulePublicationHandler(secret, queue),
      method: "get",
      path: RUN_ENDPOINT,
    },
  ];
}
