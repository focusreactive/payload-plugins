import type { VeEditorState } from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";
import type { TextPosition } from "./caret.js";

export type EditSessionOptions = {
  twin: HTMLElement;
  state: VeEditorState;
  formats: VeRichTextFormats;
  rendered: HTMLElement | null;
  caret: TextPosition | null;
  onChange(state: VeEditorState): void;
  onCancel(): void;
  onCommit(): void;
};

export interface EditSession {
  end(): void;
}

export type RichTextEditor = {
  startEditSession(options: EditSessionOptions): EditSession | null;
};

declare const RICH_TEXT_EDITOR: unique symbol;

export type RichTextEditorHandle = { readonly [RICH_TEXT_EDITOR]: true };

export type RichTextEditorModule = { readonly richTextEditor: RichTextEditorHandle };

export type RichTextEditorLoader = () => Promise<RichTextEditorModule>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRichTextEditor = (value: unknown): value is RichTextEditor =>
  isObject(value) && typeof value.startEditSession === "function";

export const handleOf = (editor: RichTextEditor): RichTextEditorHandle =>
  editor as unknown as RichTextEditorHandle;

export const editorOf = (loaded: unknown): RichTextEditor | null => {
  const editor = isObject(loaded) ? loaded.richTextEditor : null;
  return isRichTextEditor(editor) ? editor : null;
};
