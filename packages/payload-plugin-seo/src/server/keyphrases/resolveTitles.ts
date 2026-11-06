import type { PayloadRequest } from "payload";
import type { DocTarget } from "../../keyphrases/docTarget";
import type { UsageDoc } from "../../keyphrases/usage";
import { groupByCollection, titleFieldOf, toUsageDoc } from "../docTargets";
import { findDocsByIds } from "../findDocsByIds";

export async function resolveTitles(
  req: PayloadRequest,
  targets: DocTarget[],
  locale: string
): Promise<UsageDoc[]> {
  const groups = [...groupByCollection(targets)];

  const resolved = await Promise.all(
    groups.map(async ([collection, ids]) => {
      const titleField = titleFieldOf(req, collection);

      const docs = await findDocsByIds(req.payload, {
        collection,
        ids,
        overrideAccess: false,
        locale,
        select: { [titleField]: true },
        req,
      });

      return docs.map((doc) => toUsageDoc(collection, doc, titleField));
    })
  );

  return resolved.flat();
}
