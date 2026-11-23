import type { PayloadRequest } from "payload";
import type { DocTarget } from "../../keyphrases/docTarget";
import { docTargetKey } from "../../keyphrases/docTarget";
import type { UsageDoc } from "../../keyphrases/usage";
import { findReadableDocs } from "../docTargets";

export async function resolveLinkedDocs(
  req: PayloadRequest,
  targets: DocTarget[],
  locale: string
): Promise<UsageDoc[]> {
  const found = await findReadableDocs(req, targets, { locale, titleOnly: true });
  const summaries = new Map(
    found.map(({ summary }) => [docTargetKey(summary.collection, summary.id), summary])
  );

  return targets.flatMap(({ collection, docId }) => {
    const summary = summaries.get(docTargetKey(collection, docId));

    return summary ? [summary] : [];
  });
}
