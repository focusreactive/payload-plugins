import { MAX_LINKED_DOCS } from "../../../constants";
import type { DocTarget } from "../../../keyphrases/docTarget";
import { docTargetKey, readDocId } from "../../../keyphrases/docTarget";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isRelation(node: UnknownRecord): boolean {
  return "relationTo" in node;
}

function readInternalTarget(node: UnknownRecord): DocTarget | null {
  if (node.linkType !== "internal" || !isRecord(node.doc)) return null;

  const { relationTo, value } = node.doc;
  const docId = readDocId(isRecord(value) ? value.id : value);

  return typeof relationTo === "string" && docId ? { collection: relationTo, docId } : null;
}

export function readInternalLinks(values: unknown): DocTarget[] {
  const targets = new Map<string, DocTarget>();
  const pending: unknown[] = [values];

  while (pending.length > 0 && targets.size < MAX_LINKED_DOCS) {
    const node = pending.pop();
    if (!isRecord(node) || isRelation(node)) continue;

    const target = readInternalTarget(node);
    if (target) targets.set(docTargetKey(target.collection, target.docId), target);

    const nested = Object.values(node);
    for (let index = nested.length - 1; index >= 0; index -= 1) pending.push(nested[index]);
  }

  return [...targets.values()];
}
