export type IndexRow = {
  id: number;
  docCollection: string;
  docId: string;
  locale: string;
  keyphrases: unknown;
  intents?: string[];
};

type Condition = Record<string, Record<string, unknown>>;
export type Where = { and?: Where[]; or?: Where[] } & Condition;

export function matchesWhere(row: IndexRow, where: Where): boolean {
  if (where.and) return where.and.every((w) => matchesWhere(row, w));
  if (where.or) return where.or.some((w) => matchesWhere(row, w));

  return Object.entries(where as Condition).every(([field, ops]) => {
    const value = row[field as keyof IndexRow];
    return Object.entries(ops).every(([op, expected]) => {
      if (op === "equals")
        return Array.isArray(value) ? value.includes(expected) : value === expected;
      if (op === "not_equals") return value !== expected;
      if (op === "in") return (expected as unknown[]).includes(value);
      throw new Error(`unsupported operator ${op}`);
    });
  });
}
