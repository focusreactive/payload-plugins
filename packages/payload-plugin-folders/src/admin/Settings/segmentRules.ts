import type { FolderId } from "../../types.js";

/**
 * A settings form reads the item with no locale fallback, so a field the item has no value of its
 * own for in this language (a title, a name or a segment that falls back to the default language)
 * is empty. Leaving it empty is no change and needs nothing; only a value the editor emptied is
 * refused, because that would be an edit to nothing.
 */
export const isValueAccepted = (stored: string, edited: string): boolean =>
  edited !== "" || edited === stored;

/**
 * Whether the segment has to be checked against the folder the item is going to. A new parent
 * puts the stored segment into a folder nobody checked it against, and the settings save writes
 * the rename before it moves, so a clash found only by the move would leave the rename done.
 */
export const needsSegmentCheck = ({
  editedParentId,
  editedSegment,
  storedParentId,
  storedSegment,
}: {
  editedParentId: FolderId | null;
  editedSegment: string;
  storedParentId: FolderId | null;
  storedSegment: string;
}): boolean =>
  editedSegment !== "" &&
  (editedSegment !== storedSegment || String(editedParentId) !== String(storedParentId));
