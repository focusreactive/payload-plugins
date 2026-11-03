/**
 * The read limits the tree endpoints use internally (candidates per collection in a search, rows
 * per collection for child counts) take a lower value from tests, so a small fixture can reach
 * them. They are never raised: a caller of the public functions cannot ask for more than the
 * default, which is what keeps one request from reading an unbounded number of rows.
 */
export const clampInternalLimit = ({
  defaultValue,
  minimum,
  value,
}: {
  defaultValue: number;
  /** The smallest value the limit may take: 0 makes every read hit it, 1 keeps a read useful. */
  minimum: number;
  value: number | undefined;
}): number =>
  value === undefined || Number.isNaN(value)
    ? defaultValue
    : Math.min(Math.max(Math.trunc(value), minimum), defaultValue);
