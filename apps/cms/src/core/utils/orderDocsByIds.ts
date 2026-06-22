export function orderDocsByIds<T extends { id: number | string }>(
  docs: T[],
  orderedIds: (number | string)[]
): T[] {
  const byId = new Map(docs.map((doc) => [String(doc.id), doc]));

  return orderedIds.map((id) => byId.get(String(id))).filter((doc): doc is T => doc !== undefined);
}
