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

// A new array per collection: plugins push their own buttons into it, and a shared array shows every collection's button on every document.
export const createLiveBeforeDocumentControls = (): string[] =>
  PRESERVE_AUTOSAVE_EDITS ? ["/components/admin/PreserveAutosaveEdits#PreserveAutosaveEdits"] : [];
