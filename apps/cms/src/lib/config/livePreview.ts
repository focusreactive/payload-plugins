import type { CollectionConfig } from "payload";

import {
  LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS,
  PRESERVE_AUTOSAVE_EDITS,
} from "@/lib/constants/livePreview";

export const LIVE_PREVIEW_VERSIONS = {
  drafts: { autosave: { interval: LIVE_PREVIEW_AUTOSAVE_INTERVAL_MS } },
  maxPerDoc: 50,
} satisfies CollectionConfig["versions"];

export const LIVE_PREVIEW_BEFORE_DOCUMENT_CONTROLS = PRESERVE_AUTOSAVE_EDITS
  ? ["/components/admin/PreserveAutosaveEdits#PreserveAutosaveEdits"]
  : [];
