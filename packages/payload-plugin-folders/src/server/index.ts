// The server-side API of the folders plugin. It grows with the tickets; the move functions are first.
export { applyMove, moveItems } from "../core/applyMove.js";
export type { MoveItemsArgs, MoveResult } from "../core/applyMove.js";
export { MoveBlockedError, planMove } from "../core/move.js";
export type {
  ExpectedState,
  MoveBlock,
  MoveBlockReason,
  MoveItemInput,
  MovePreview,
  MoveRequest,
  MoveTarget,
  MoveWarning,
} from "../core/move.js";
