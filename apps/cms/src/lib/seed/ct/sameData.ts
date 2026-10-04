/**
 * True when every value in `data` (what the seed would write) already holds in `doc` (a depth-0
 * read). Keys absent from `data` are ignored, so ids, timestamps and Payload's own fields never
 * count as a change. Lets steps skip writes that would only add a version. `data` must hold only
 * fields the schema stores (e.g. no label on a `disableLabel` link), or it never compares equal.
 */
export function sameData(data: unknown, doc: unknown): boolean {
  if (data === undefined) {
    return true;
  }
  if (data === null || typeof data !== "object") {
    return data === doc || (data === null && doc === undefined);
  }
  if (Array.isArray(data)) {
    return (
      Array.isArray(doc) &&
      doc.length === data.length &&
      data.every((item, index) => sameData(item, doc[index]))
    );
  }
  if (doc === null || typeof doc !== "object") {
    return false;
  }
  const record = doc as Record<string, unknown>;
  return Object.entries(data).every(([key, value]) => sameData(value, record[key]));
}
