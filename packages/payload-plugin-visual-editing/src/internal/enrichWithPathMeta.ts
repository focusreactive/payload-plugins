import { isPlainObject, META_KEY, ROOT_ARRAY_TOKEN, toMetaInfo } from "./shared.js";
import type { PlainObject, VeIdentity } from "./shared.js";

type DocInfo = Omit<VeIdentity, "path">;

export const enrichWithPathMeta = <T>(value: T, docInfo: DocInfo, rootPrefix = ""): T => {
  const rootToken = Array.isArray(value) ? ROOT_ARRAY_TOKEN : "";
  const effectiveRoot = [rootPrefix, rootToken].filter(Boolean).join(".");
  return enrichRecursive(value, effectiveRoot, docInfo) as T;
};

const enrichRecursive = (value: unknown, path: string, docInfo: DocInfo): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => enrichRecursive(item, `${path}.${index}`, docInfo));
  }

  if (!isPlainObject(value)) return value;

  // Already enriched by an inner collection's afterRead
  if (META_KEY in value) return value;

  const result: PlainObject = {};

  for (const key of Object.keys(value)) {
    const child = value[key];
    const childPath = path ? `${path}.${key}` : key;
    result[key] = enrichRecursive(child, childPath, docInfo);
  }

  if (!hasPrimitiveValue(value)) return result;

  // When a parent has exactly one array-of-objects child and no other container siblings,
  // lift the array elements' `_meta` off — the parent holder is the natural edit anchor
  liftIfSingleArrayChild(result);

  result[META_KEY] = toMetaInfo({ ...docInfo, path });

  return result;
};

const liftIfSingleArrayChild = (result: PlainObject): void => {
  let candidateArrayKey: string | null = null;
  let hasOtherContainer = false;

  for (const key of Object.keys(result)) {
    const child = result[key];
    if (isPlainObject(child)) {
      hasOtherContainer = true;
      continue;
    }
    if (!Array.isArray(child)) continue;

    const objectElements = child.filter(isPlainObject);
    if (objectElements.length === 0) continue;

    // Blocks and array rows are independently editable; never lift their anchors.
    if (objectElements.some(isPayloadEditableItem)) {
      hasOtherContainer = true;
      continue;
    }

    const allLifted = objectElements.every((el) => META_KEY in el);
    if (allLifted && candidateArrayKey === null) {
      candidateArrayKey = key;
    } else {
      hasOtherContainer = true;
    }
  }

  if (candidateArrayKey !== null && !hasOtherContainer) {
    const arr = result[candidateArrayKey] as unknown[];
    for (const el of arr) {
      if (isPlainObject(el)) delete (el as PlainObject)[META_KEY];
    }
  }
};

// Payload stamps every block/array row with an auto `id` (blocks also carry
// `blockType`); Lexical nodes have `type`/`version` but neither of these.
const isPayloadEditableItem = (el: PlainObject): boolean => "blockType" in el || "id" in el;

const hasPrimitiveValue = (obj: PlainObject): boolean => {
  for (const key in obj) {
    if (key === META_KEY) continue;
    const value = obj[key];
    if (typeof value === "string" || typeof value === "number") return true;
  }
  return false;
};
