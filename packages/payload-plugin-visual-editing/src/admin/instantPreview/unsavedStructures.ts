import type {
  VeEditorState,
  VeLiveDocument,
  VeRichTextStructureMessage,
} from "../../shared/protocol.js";
import type { RichTextNodeText, RichTextRead } from "./richTextReads.js";

import { VE_RICH_TEXT_STRUCTURE_TYPE } from "../../shared/protocol.js";
import { withoutBlockFields } from "../../shared/richText/blockNodes.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { createRichTextReads } from "./richTextReads.js";

export type FieldAddresses = ReadonlySet<string>;

type ToldStructure = { shape: string; state: VeEditorState | null };

export type ToldStructures = ReadonlyMap<string, ToldStructure>;

type UnsavedStructures = {
  messages: VeRichTextStructureMessage[];
  nodeTexts: RichTextNodeText[];
  told: ToldStructures;
  toldNodeKeys: ReadonlySet<string>;
};

type Telling = { isNews: boolean; told: ToldStructure };

const tell = (known: ToldStructure | undefined, read: RichTextRead): Telling | null => {
  const { current, editorShape, savedShape } = read;
  if (editorShape === null || savedShape === null || !isPlainObject(current)) return null;

  if (editorShape === savedShape) {
    const isNews = known !== undefined && known.shape !== editorShape;
    return { isNews, told: { shape: editorShape, state: null } };
  }
  const isToldAlready = known?.shape === editorShape && known.state !== null;
  return isToldAlready
    ? { isNews: false, told: known }
    : { isNews: true, told: { shape: editorShape, state: current } };
};

export const createUnsavedStructures = () => {
  const readAgainstToldState = createRichTextReads();

  return (
    richTexts: readonly RichTextRead[],
    document: VeLiveDocument,
    liveRichTexts: FieldAddresses,
    known: ToldStructures
  ): UnsavedStructures => {
    const messages: VeRichTextStructureMessage[] = [];
    const nodeTexts: RichTextNodeText[] = [];
    const told = new Map<string, ToldStructure>();
    const toldNodeKeys = new Set<string>();

    for (const read of richTexts) {
      const { current, fieldAddress, fieldKey } = read;
      const telling = liveRichTexts.has(fieldAddress) ? tell(known.get(fieldAddress), read) : null;
      if (!telling) continue;

      const { shape, state } = telling.told;
      told.set(fieldAddress, telling.told);
      if (telling.isNews) {
        messages.push({
          type: VE_RICH_TEXT_STRUCTURE_TYPE,
          ...document,
          key: fieldKey,
          shape,
          state: state && withoutBlockFields(state),
        });
      }
      if (state === null) continue;

      const nodesOfToldState = readAgainstToldState({ current, document, fieldKey, saved: state });
      nodeTexts.push(...nodesOfToldState.nodeTexts);
      if (telling.isNews) for (const { key } of nodesOfToldState.nodeTexts) toldNodeKeys.add(key);
    }
    return { messages, nodeTexts, told, toldNodeKeys };
  };
};
