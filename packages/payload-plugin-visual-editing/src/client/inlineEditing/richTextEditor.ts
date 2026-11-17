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

export type RichTextEditorLoader = () => Promise<RichTextEditor>;
