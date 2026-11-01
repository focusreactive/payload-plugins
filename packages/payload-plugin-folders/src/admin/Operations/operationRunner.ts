import type { OperationProgress } from "../../core/operations.js";
import type { FolderId } from "../../types.js";

export type OperationRunnerOptions = {
  /** Whether stepping may go on: false once the page that owns the runner is gone. */
  isActive: () => boolean;
  /** Called with every answer, the last one of a run included. */
  onProgress: (id: FolderId, progress: OperationProgress) => void;
  /** Takes the next step of an operation; a thrown error (the network) counts as a failed step. */
  step: (id: FolderId) => Promise<OperationProgress>;
};

export type OperationRunner = {
  /** Whether a loop is stepping this operation now. */
  isRunning: (id: FolderId) => boolean;
  /**
   * Steps an operation one slice after another until it is done or a step fails. A second call for
   * an operation that is already being stepped does nothing, so a dialog and a banner can both ask.
   * To retry a failed one, call it again. `known` is where the operation stands, which a step that
   * fails before it hears from the server reports again.
   */
  run: (id: FolderId, known?: { done: number; total: number }) => Promise<void>;
};

const failureMessageOf = (error: unknown): string =>
  error instanceof Error && error.message !== "" ? error.message : "The step failed";

/**
 * The stepping loop of spec section 5.8, apart from React: a closed dialog does not stop it, a
 * failed step stops it without losing the place (the server keeps the cursor, so the next call does
 * the same slice again), and a second caller never starts a second loop for the same operation.
 */
export const createOperationRunner = ({
  isActive,
  onProgress,
  step,
}: OperationRunnerOptions): OperationRunner => {
  const running = new Set<string>();

  const run = async (id: FolderId, known = { done: 0, total: 0 }): Promise<void> => {
    const key = String(id);
    if (running.has(key)) {
      return;
    }
    running.add(key);
    let lastDone = known.done;
    let lastTotal = known.total;
    try {
      while (isActive()) {
        let progress: OperationProgress;
        try {
          progress = await step(id);
        } catch (error) {
          progress = {
            done: lastDone,
            error: failureMessageOf(error),
            status: "failed",
            total: lastTotal,
          };
        }
        lastDone = progress.done;
        lastTotal = progress.total;
        onProgress(id, progress);
        if (progress.status !== "running") {
          break;
        }
      }
    } finally {
      running.delete(key);
    }
  };

  return { isRunning: (id) => running.has(String(id)), run };
};
