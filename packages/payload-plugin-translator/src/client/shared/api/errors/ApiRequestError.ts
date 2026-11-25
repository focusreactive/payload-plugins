import type { ZodIssue } from "zod";

/**
 * Why a request to the plugin's server failed. `rejected` is a request the server refused as
 * invalid; `busy` is an action refused because the document already has a live run.
 */
export type ApiRequestErrorReason =
  | "network"
  | "timeout"
  | "forbidden"
  | "not-found"
  | "rejected"
  | "server"
  | "busy";

type ApiRequestErrorFacts = {
  status?: number;
  /** The fields a `rejected` request got wrong, for a form to show beside each one. */
  details?: ZodIssue[];
};

export class ApiRequestError extends Error {
  override readonly name = "ApiRequestError";
  readonly reason: ApiRequestErrorReason;
  readonly status?: number;
  readonly details?: ZodIssue[];

  constructor(reason: ApiRequestErrorReason, message: string, facts: ApiRequestErrorFacts = {}) {
    super(message);
    this.reason = reason;
    this.status = facts.status;
    this.details = facts.details;
  }
}
