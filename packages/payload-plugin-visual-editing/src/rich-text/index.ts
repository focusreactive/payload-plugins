import { startEditSession } from "../client/inlineEditing/richText/editSession.js";
import { handleOf } from "../client/inlineEditing/richTextEditor.js";

export const richTextEditor = handleOf({ startEditSession });
