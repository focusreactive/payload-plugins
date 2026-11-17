import type { VeEditorState } from "../../shared/protocol.js";
import type { VeRichTextFormats } from "../../shared/richText/formats.js";
import type { Point } from "./caret.js";

export type EditSessionOptions = {
  twin: HTMLElement;
  state: VeEditorState;
  formats: VeRichTextFormats;
  point: Point | null;
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
