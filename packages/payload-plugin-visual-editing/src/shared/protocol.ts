export const DATA_VE_PATH_ATTR = "data-ve-path";
export const DATA_VE_DOC_ID_ATTR = "data-ve-doc-id";
export const DATA_VE_COLLECTION_ATTR = "data-ve-collection";
export const DATA_VE_KIND_ATTR = "data-ve-kind";
export const DATA_VE_LOCALE_ATTR = "data-ve-locale";
export const DATA_VE_KEY_ATTR = "data-ve-key";

export const VE_IDENTITY_ATTRS: readonly string[] = [
  DATA_VE_PATH_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_KEY_ATTR,
];

export const VE_FOCUS_PARAM = "veFocus";

export type DocKind = "collection" | "global";

export const VE_READ_HEADER = "x-visual-editing";

export const VE_PREVIEW_GRANT_PATH = "/visual-editing/preview-grant";

export const VE_UNSAVED_RICH_TEXT_PATH = "/visual-editing/unsaved-rich-text";

export const VE_PREVIEW_GRANT_TYPE = "ve:preview-grant";

export type VePreviewGrantMessage = {
  type: typeof VE_PREVIEW_GRANT_TYPE;
  grant: string;
  expiresAt: number;
};

export const VE_PREVIEW_GRANT_REQUEST_TYPE = "ve:preview-grant-request";

export type VePreviewGrantRequestMessage = {
  type: typeof VE_PREVIEW_GRANT_REQUEST_TYPE;
  pageId: string;
};

export const VE_MESSAGE_TYPE = "ve:open-field";

export type VeOpenFieldMessage = {
  type: typeof VE_MESSAGE_TYPE;
  path: string;
  key?: string;
  docId?: string;
  collectionSlug: string;
  kind: DocKind;
  locale?: string;
  focus?: false;
};

export const DATA_VE_LIVE_RICH_TEXT_ATTR = "data-ve-live-rich-text";

export const DATA_VE_LIVE_ATTR = "data-ve-live";
export const VE_LIVE_OFF = "off";

export type VeDocument = {
  collectionSlug: string;
  kind: DocKind;
  docId?: string;
};

export type VeLiveDocument = VeDocument & {
  locale?: string;
};

export type VeRenderedFields = VeDocument & {
  keys: string[];
};

export const VE_FIELDS_RENDERED_TYPE = "ve:fields-rendered";

export const VE_RICH_TEXT_RENDERED_TYPE = "ve:rich-text-rendered";

export type VeRenderedType = typeof VE_FIELDS_RENDERED_TYPE | typeof VE_RICH_TEXT_RENDERED_TYPE;

export type VeRenderedMessage<Type extends VeRenderedType> = {
  type: Type;
  pageId: string;
  locale?: string;
  rendered: VeRenderedFields[];
};

export const VE_ANNOUNCE_REQUEST_TYPE = "ve:announce-request";

export type VeAnnounceRequestMessage = {
  type: typeof VE_ANNOUNCE_REQUEST_TYPE;
};

export const VE_DOCUMENT_SAVED_TYPE = "ve:document-saved";

export type VeDocumentSavedMessage = Partial<VeLiveDocument> & {
  type: typeof VE_DOCUMENT_SAVED_TYPE;
};

export const VE_FIELD_SNAPSHOT_TYPE = "ve:field-snapshot";

export type VeFieldSnapshotEntry = {
  key: string;
  saved: string;
  value: string;
};

export type VeFieldSnapshotMessage = VeLiveDocument & {
  type: typeof VE_FIELD_SNAPSHOT_TYPE;
  fields: VeFieldSnapshotEntry[];
};

export const VE_FIELD_PATCH_TYPE = "ve:field-patch";

export type VeFieldPatch = {
  key: string;
  value: string;
};

export type VeFieldPatchMessage = VeLiveDocument & {
  type: typeof VE_FIELD_PATCH_TYPE;
  patches: VeFieldPatch[];
};

export const VE_FIELD_EDIT_PATH = "/visual-editing/field-edit";

export const VE_FIELD_EDIT_TYPE = "ve:field-edit";

export type VeEditedField = VeLiveDocument & {
  key: string;
};

export type VeFieldEdit = VeEditedField & {
  value: string;
};

export type VeFieldEditMessage = VeFieldEdit & {
  type: typeof VE_FIELD_EDIT_TYPE;
};

export const VE_FIELD_EDIT_REFUSED_TYPE = "ve:field-edit-refused";

export type VeFieldEditRefusedMessage = VeEditedField & {
  type: typeof VE_FIELD_EDIT_REFUSED_TYPE;
};

export const VE_MEDIA_OPTIONS_PATH = "/visual-editing/media-options";

export type VeMediaOptionsRequest = VeEditedField & {
  search: string;
  page: number;
};

export type VeShownMedia = {
  url: string;
  width?: number;
  height?: number;
};

export type VeMediaOption = VeShownMedia & {
  id: number | string;
  filename: string;
  thumbnailUrl: string;
  alt?: string;
};

export type VeMediaOptions = {
  collection: string | null;
  documents: VeMediaOption[];
  hasNextPage: boolean;
};

export const VE_PICK_MEDIA_TYPE = "ve:pick-media";

export type VePickMediaMessage = VeEditedField & {
  type: typeof VE_PICK_MEDIA_TYPE;
};

export const VE_MEDIA_PICK_CANCELLED_TYPE = "ve:media-pick-cancelled";

export type VeMediaPickCancelledMessage = VeEditedField & {
  type: typeof VE_MEDIA_PICK_CANCELLED_TYPE;
};

export const VE_MEDIA_PICKED_TYPE = "ve:media-picked";

export type VeMediaPickedMessage = VeEditedField &
  VeShownMedia & {
    type: typeof VE_MEDIA_PICKED_TYPE;
  };

export const VE_RICH_TEXT_STRUCTURE_TYPE = "ve:rich-text-structure";

export type VeEditorState = Record<string, unknown>;

export type VeRichTextFormats = {
  textFormats: number;
  headings: string[];
  lists: string[];
  hasLinks: boolean;
  hasQuotes: boolean;
};

export const VE_RICH_TEXT_VALUE_PATH = "/visual-editing/rich-text-value";

export type VeRichTextValue = {
  value: VeEditorState | null;
  formats: VeRichTextFormats | null;
};

export type VeRichTextEdit = VeEditedField & {
  state: VeEditorState;
};

export type VeEdit = VeFieldEdit | VeRichTextEdit;

export const VE_RICH_TEXT_STATE_REQUEST_TYPE = "ve:rich-text-state-request";

export type VeRichTextStateRequestMessage = VeEditedField & {
  type: typeof VE_RICH_TEXT_STATE_REQUEST_TYPE;
};

export const VE_RICH_TEXT_STATE_TYPE = "ve:rich-text-state";

export type VeRichTextStateMessage = VeRichTextEdit & {
  type: typeof VE_RICH_TEXT_STATE_TYPE;
  formats: VeRichTextFormats;
};

export const VE_RICH_TEXT_STATE_REFUSED_TYPE = "ve:rich-text-state-refused";

export type VeRichTextStateRefusedMessage = VeEditedField & {
  type: typeof VE_RICH_TEXT_STATE_REFUSED_TYPE;
};

export const VE_RICH_TEXT_EDIT_TYPE = "ve:rich-text-edit";

export type VeRichTextEditMessage = VeRichTextEdit & {
  type: typeof VE_RICH_TEXT_EDIT_TYPE;
};

export const VE_RICH_TEXT_EDIT_ENDED_TYPE = "ve:rich-text-edit-ended";

export type VeRichTextEditEndedMessage = VeEditedField & {
  type: typeof VE_RICH_TEXT_EDIT_ENDED_TYPE;
};

export type VeRichTextStructureMessage = VeLiveDocument & {
  type: typeof VE_RICH_TEXT_STRUCTURE_TYPE;
  key: string;
  shape: string;
  state: VeEditorState | null;
};

export type LiveRichTextField = VeDocument & {
  key: string;
};

export type LiveRichTextRequest = {
  field: LiveRichTextField;
  locale?: string;
  state: unknown;
};
