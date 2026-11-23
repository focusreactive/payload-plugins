import type { CollectionConfig } from "payload";

import {
  LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS,
  PRESERVE_AUTOSAVE_EDITS,
} from "@/lib/constants/livePreview";

export const createLivePreviewVersions = () =>
  ({
    drafts: { autosave: { interval: LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS } },
    maxPerDoc: 50,
  }) satisfies CollectionConfig["versions"];

type EditViewComponents = NonNullable<
  NonNullable<NonNullable<CollectionConfig["admin"]>["components"]>["edit"]
>;

export const createLivePreviewEditComponents = () =>
  ({
    beforeDocumentControls: PRESERVE_AUTOSAVE_EDITS
      ? ["/components/admin/PreserveAutosaveEdits#PreserveAutosaveEdits"]
      : [],
    PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
  }) satisfies EditViewComponents;
