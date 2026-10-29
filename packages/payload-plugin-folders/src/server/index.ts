// The server-side API of the folders plugin. It grows with the tickets; the move functions are first.
export { canRepairTree, getItemAccess } from "../core/access.js";
export { applyMove, moveItems } from "../core/applyMove.js";
export type { MoveItemsArgs, MoveResult } from "../core/applyMove.js";
export { checkSegment } from "../core/checkSegment.js";
export type { SegmentCheck } from "../core/checkSegment.js";
export { planFolderEdit } from "../core/folderPreview.js";
export type { FolderEdit } from "../core/folderPreview.js";
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
  PlanSettings,
} from "../core/move.js";
