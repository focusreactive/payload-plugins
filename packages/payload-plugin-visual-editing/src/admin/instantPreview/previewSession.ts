import type { FormState } from "payload";

import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { PlainObject } from "../../shared/plainObject.js";
import type {
  VeFieldPatchMessage,
  VeFieldSnapshotMessage,
  VeLiveDocument,
  VeRenderedFields,
  VeRichTextStructureMessage,
} from "../../shared/protocol.js";
import type { FieldsRead, FieldValues, NodeTexts } from "./fieldMessages.js";
import type { FieldAddresses, ToldStructures } from "./unsavedStructures.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { VE_FIELDS_RENDERED_TYPE, VE_RICH_TEXT_RENDERED_TYPE } from "../../shared/protocol.js";
import { fieldAddressOf, isVeDocument } from "../../shared/veDocument.js";
import { patchOf, snapshotEntriesOf, snapshotOf, textsSinceSaveOf } from "./fieldMessages.js";
import { readFormFields } from "./formFields.js";
import { createRichTextFieldReads } from "./richTextReads.js";
import { createUnsavedStructures } from "./unsavedStructures.js";

export { REMEMBERED_TYPED_TEXTS } from "./fieldMessages.js";

export type AdminState = {
  document: VeLiveDocument;
  editableSchema: EditableSchema;
  formState: FormState;
  savedDocument: unknown;
};

export type PreviewMessage =
  | VeFieldSnapshotMessage
  | VeFieldPatchMessage
  | VeRichTextStructureMessage;

export interface PreviewSession {
  formChanged(admin: AdminState | null): PreviewMessage[];
  pageAnnounced(message: unknown): PreviewMessage[];
  localeChanged(locale: string): void;
  pageLeft(): void;
}

type Told = { nodeTexts: NodeTexts; savedDocument: unknown; values: FieldValues };

type FormRead = FieldsRead & {
  previous: Told | null;
  structures: VeRichTextStructureMessage[];
  toldNodeKeys: ReadonlySet<string>;
  values: FieldValues;
};

const NOTHING_TOLD: ToldStructures = new Map();
const NO_NODE_TEXTS: NodeTexts = new Map();

const isRenderedFields = (entry: unknown): entry is VeRenderedFields =>
  isPlainObject(entry) &&
  isVeDocument(entry) &&
  Array.isArray(entry.keys) &&
  entry.keys.every((key) => typeof key === "string");

const readFieldAddresses = (rendered: unknown): string[] | null => {
  if (!Array.isArray(rendered) || !rendered.every(isRenderedFields)) return null;
  return rendered.flatMap(({ keys, ...document }) =>
    keys.map((key) => fieldAddressOf(document, key))
  );
};

const isAmong =
  (fields: FieldAddresses, { document }: AdminState) =>
  ({ key }: { key: string }) =>
    fields.has(fieldAddressOf(document, key));

const wasSavedSince = (told: Told, admin: AdminState) => told.savedDocument !== admin.savedDocument;

const isPresent = <Message>(message: Message | null): message is Message => message !== null;

export function createPreviewSession(): PreviewSession {
  const readRichTextFields = createRichTextFieldReads();
  const tellUnsavedStructures = createUnsavedStructures();
  const renderedSinceLoad = new Set<string>();
  const liveRichTextsSinceLoad = new Set<string>();
  let loadedPageId: string | null = null;
  let dismissedPageId: string | null = null;
  let formLocale: string | null = null;
  let openAdmin: AdminState | null = null;
  let told: Told | null = null;
  let toldStructures = NOTHING_TOLD;

  const forgetPage = () => {
    renderedSinceLoad.clear();
    liveRichTextsSinceLoad.clear();
    loadedPageId = null;
  };

  const forgetTold = () => {
    told = null;
    toldStructures = NOTHING_TOLD;
  };

  const isListening = () => renderedSinceLoad.size > 0 || liveRichTextsSinceLoad.size > 0;

  const isOfAnotherLocale = (pageLocale: unknown) =>
    pageLocale !== undefined && formLocale !== null && pageLocale !== formLocale;

  const readForm = (admin: AdminState): FormRead => {
    const formFields = readFormFields(admin.formState, admin.editableSchema);
    const previous = told;
    const richTexts = readRichTextFields(formFields, admin);
    const unsaved = tellUnsavedStructures(
      richTexts,
      admin.document,
      liveRichTextsSinceLoad,
      toldStructures
    );
    const nodeTexts = textsSinceSaveOf(
      [...richTexts.flatMap((richText) => richText.nodeTexts), ...unsaved.nodeTexts],
      previous?.nodeTexts ?? NO_NODE_TEXTS
    );
    const richTextNodes = snapshotEntriesOf(nodeTexts);
    const values = new Map([...formFields, ...richTextNodes].map(({ key, value }) => [key, value]));
    const isKnownSinceLastSave = previous !== null && !wasSavedSince(previous, admin);
    toldStructures = unsaved.told;
    told = {
      nodeTexts,
      savedDocument: admin.savedDocument,
      values: isKnownSinceLastSave ? new Map([...previous.values, ...values]) : values,
    };
    return {
      formFields,
      previous,
      richTextNodes,
      structures: unsaved.messages,
      toldNodeKeys: unsaved.toldNodeKeys,
      values,
    };
  };

  const update = (admin: AdminState): PreviewMessage[] => {
    const read = readForm(admin);
    const { previous, structures, toldNodeKeys, values } = read;
    const isRendered = isAmong(renderedSinceLoad, admin);
    if (previous === null) return structures;
    if (wasSavedSince(previous, admin)) {
      return [...structures, snapshotOf(admin, read, isRendered)].filter(isPresent);
    }
    return [
      ...structures,
      snapshotOf(admin, read, (field) => toldNodeKeys.has(field.key) && isRendered(field)),
      patchOf(admin.document, previous.values, values, isRendered),
    ].filter(isPresent);
  };

  const readAnnouncementOfPage = ({ locale, pageId, rendered }: PlainObject): string[] | null => {
    const announced = readFieldAddresses(rendered);
    if (typeof pageId !== "string" || announced === null) return null;
    if (pageId === dismissedPageId) return null;

    if (pageId !== loadedPageId) {
      forgetPage();
      loadedPageId = pageId;
    }
    return isOfAnotherLocale(locale) ? null : announced;
  };

  const answerFieldsRendered = (message: PlainObject): PreviewMessage[] => {
    const announced = readAnnouncementOfPage(message);
    if (announced === null) return [];
    const isFirstOfPage = renderedSinceLoad.size === 0;
    for (const fieldAddress of announced) renderedSinceLoad.add(fieldAddress);
    if (!openAdmin) return [];
    if (isFirstOfPage) told = null;
    const read = readForm(openAdmin);
    const isAnnounced = isAmong(new Set(announced), openAdmin);
    return [...read.structures, snapshotOf(openAdmin, read, isAnnounced)].filter(isPresent);
  };

  const answerLiveRichTexts = (message: PlainObject): PreviewMessage[] => {
    const announced = readAnnouncementOfPage(message);
    if (announced === null) return [];
    for (const fieldAddress of announced) liveRichTextsSinceLoad.add(fieldAddress);
    if (!openAdmin) return [];
    const announcedFields = new Set(announced);
    toldStructures = new Map(
      [...toldStructures].filter(([fieldAddress]) => !announcedFields.has(fieldAddress))
    );
    return update(openAdmin);
  };

  return {
    formChanged(admin) {
      openAdmin = admin;
      if (!admin || !isListening()) {
        forgetTold();
        return [];
      }
      return update(admin);
    },
    localeChanged(locale) {
      formLocale = locale;
      dismissedPageId = loadedPageId ?? dismissedPageId;
      forgetPage();
      forgetTold();
    },
    pageAnnounced(message) {
      if (!isPlainObject(message)) return [];
      if (message.type === VE_FIELDS_RENDERED_TYPE) return answerFieldsRendered(message);
      if (message.type === VE_RICH_TEXT_RENDERED_TYPE) return answerLiveRichTexts(message);
      return [];
    },
    pageLeft() {
      forgetPage();
      forgetTold();
    },
  };
}
