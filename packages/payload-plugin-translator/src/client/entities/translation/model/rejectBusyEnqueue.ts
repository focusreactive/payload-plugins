import type { EnqueueResponse } from "../../../../types/wire/ActionBodies.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";

/**
 * An enqueue answer that lists any busy document becomes a `busy` rejection, even when other
 * documents were queued: the caller refreshes on settle and sees what was queued.
 */
export function rejectBusyEnqueue<Answer extends Pick<EnqueueResponse, "busy">>(
  answer: Answer
): Answer {
  const busy = answer.busy ?? [];
  if (busy.length === 0) return answer;
  throw new ApiRequestError(
    "busy",
    `Already translating: ${busy.join(", ")}. Wait for the run to finish or cancel it.`
  );
}
