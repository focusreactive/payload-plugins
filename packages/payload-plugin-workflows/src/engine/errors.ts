export type WorkflowErrorCode =
  | "instance-not-active"
  | "unknown-stage"
  | "unknown-activity"
  | "unknown-action"
  | "not-callable"
  | "activity-not-active"
  | "not-allowed"
  | "unauthorized"
  | "invalid-params"
  | "invalid-patch"
  | "condition-error"
  | "cascade-limit"
  | "conflict"
  | "already-running"
  | "unknown-workflow"
  | "unknown-instance"
  | "unknown-subject";

/** Every refusal of the engine and the server layer. `code` is the stable, machine-readable part. */
export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;

  constructor(code: WorkflowErrorCode, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}

export const isWorkflowError = (error: unknown): error is WorkflowError =>
  error instanceof WorkflowError;
