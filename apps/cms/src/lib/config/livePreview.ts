import type { CollectionConfig } from "payload";

import {
  LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS,
  PRESERVE_AUTOSAVE_EDITS,
} from "@/lib/constants/livePreview";

// `showSaveDraftButton` only renders the collection's SaveDraftButton slot; it does not touch the versions schema.
export const createLivePreviewVersions = ({ showSaveDraftButton = false } = {}) =>
  ({
    drafts: { autosave: { interval: LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS, showSaveDraftButton } },
    maxPerDoc: 50,
  }) satisfies CollectionConfig["versions"];

// A new array per collection: plugins push their own buttons into it, and a shared array shows every collection's button on every document.
export const createLiveBeforeDocumentControls = (): string[] =>
  PRESERVE_AUTOSAVE_EDITS ? ["/components/admin/PreserveAutosaveEdits#PreserveAutosaveEdits"] : [];

type EditViewComponents = NonNullable<
  NonNullable<NonNullable<CollectionConfig["admin"]>["components"]>["edit"]
>;

export const createLivePreviewEditComponents = () =>
  ({
    beforeDocumentControls: createLiveBeforeDocumentControls(),
    PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
  }) satisfies EditViewComponents;
