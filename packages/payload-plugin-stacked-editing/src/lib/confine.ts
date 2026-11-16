type Box = { left: number; right: number; top: number };

/**
 * Where the panels go while Live Preview is open beside the editor: from the editor column's left
 * edge to the preview's left edge (or the column's own right edge when the preview is not found),
 * and from the preview's top down, so the document header and Save/Publish controls stay visible.
 * The preview column is sticky, so its top does not move while the editor scrolls.
 */
export const editorColumnBounds = ({
  editor,
  preview,
}: {
  editor: Box;
  preview?: Box | null;
}): { left: number; top: number; width: number } => {
  const besidePreview = preview !== null && preview !== undefined && preview.left > editor.left;
  const right = besidePreview ? preview.left : editor.right;
  return {
    left: Math.round(editor.left),
    top: besidePreview ? Math.max(0, Math.round(preview.top)) : 0,
    width: Math.max(0, Math.round(right - editor.left)),
  };
};

/** Payload's edit views: the column the fields render in, and the preview iframe's column. */
export const EDITOR_COLUMN_SELECTOR = ".collection-edit__main, .global-edit__main";
export const PREVIEW_COLUMN_SELECTOR = ".live-preview-window";
