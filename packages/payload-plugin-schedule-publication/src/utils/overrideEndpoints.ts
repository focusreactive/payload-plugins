import type { Endpoint } from "payload";
import { createSchedulePublicationHandler } from "../handler";
import { RUN_ENDPOINT } from "../constants";

export function overrideEndpoints(
  configEndpoints: Endpoint[] | undefined,
  secret: string,
  queue: string,
): Endpoint[] {
  return [
    ...(configEndpoints ?? []),
    {
      path: RUN_ENDPOINT,
      method: "get",
      handler: createSchedulePublicationHandler(secret, queue),
    },
  ];
}
