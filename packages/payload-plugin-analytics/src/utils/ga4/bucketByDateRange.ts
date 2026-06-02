import type { Row } from "../../types";

export function bucketByDateRange<Key extends string>(rows: Row[] | null | undefined, keys: readonly Key[]): Record<Key, Row[]> {
  const buckets = Object.fromEntries(keys.map((key) => [key, [] as Row[]])) as Record<Key, Row[]>;

  if (!rows) return buckets;

  for (const row of rows) {
    const dims = row.dimensionValues ?? [];
    const name = dims[dims.length - 1]?.value as Key | undefined;

    if (name && name in buckets) buckets[name].push(row);
  }

  return buckets;
}
