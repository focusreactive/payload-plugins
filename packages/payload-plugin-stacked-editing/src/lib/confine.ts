type Box = { left: number; right: number; top: number };

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

export const EDITOR_COLUMN_SELECTOR = ".collection-edit__main, .global-edit__main";
export const PREVIEW_COLUMN_SELECTOR = ".live-preview-window";
