import type { CollectionSlug, Payload } from "payload";

import type { TranslatableTextPresence } from "../../../core/domain/content-projection/holdsTranslatableText.js";
import { receiptsByDocument } from "../../../core/domain/provenance/index.js";
import type { ReceiptsByDocument } from "../../../core/domain/provenance/index.js";
import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";
import type { ProvenanceAccess } from "../../modules/plugin-config/index.js";
import { reportedRuns } from "../../modules/runs/index.js";
import type { ReportedRun, RunRecordStoreFactory } from "../../modules/runs/index.js";
import { localesHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import type { DocumentsHoldingContent } from "../../shared/payload/localesHoldingContent.js";

type StateReadQuestion = {
  payload: Payload;
  collection: CollectionSlug;
  ids: readonly DocumentId[];
  targets: readonly LocaleCode[];
  holdsText: TranslatableTextPresence;
  provenance: ProvenanceAccess | undefined;
  runRecordStoreFactory: RunRecordStoreFactory;
  failedWindowMs: number;
};

type StateReadAnswer = {
  holding: DocumentsHoldingContent;
  receipts: ReceiptsByDocument;
  runs: ReportedRun[];
};

/** A failure shows until a later run of its locale replaces it, or until the window passes. */
export async function readState(question: StateReadQuestion): Promise<StateReadAnswer> {
  const { payload, collection, ids, targets, holdsText, provenance } = question;
  const { runRecordStoreFactory, failedWindowMs } = question;
  const since = new Date(Date.now() - failedWindowMs);
  const runs = runRecordStoreFactory(payload);
  const [holding, receipts, shown] = await Promise.all([
    localesHoldingContent({
      payload,
      collection,
      grantedIds: ids,
      locales: targets,
      holdsText,
    }),
    provenance
      ? receiptsByDocument(provenance.storeFactory(payload), collection, ids)
      : new Map<DocumentId, never[]>(),
    runs.findLiveOrUndeliveredSince(collection, ids, since),
  ]);
  // Deliveries are read apart, and only where something failed: a busy page's deliveries would
  // otherwise share one capped read with the failures and could crowd an old one out.
  const failing = [
    ...new Set(shown.filter((row) => row.settledAt !== null).map((row) => row.collectionId)),
  ];
  const replacing =
    failing.length === 0 ? [] : await runs.findDeliveredSince(collection, failing, since);
  return { holding, receipts, runs: reportedRuns([...shown, ...replacing]) };
}
