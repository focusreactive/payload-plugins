export interface MockRow {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}

export function row(dims: string[], metrics: string[]): MockRow {
  return {
    dimensionValues: dims.map((value) => ({ value })),
    metricValues: metrics.map((value) => ({ value })),
  };
}

export function response(rows: MockRow[]): { rows: MockRow[]; rowCount: number } {
  return { rows, rowCount: rows.length };
}

export function batch(reports: ReturnType<typeof response>[]): { reports: ReturnType<typeof response>[] } {
  return { reports };
}
