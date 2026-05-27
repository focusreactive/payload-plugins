import type { ReactNode } from "react";
import { Metric } from "../../Metric";
import type { TopNTableColumn } from "../types";

export function renderCell<Row>(col: TopNTableColumn<Row>, row: Row): ReactNode {
  if (col.value && col.format) {
    return (
      <Metric
        value={col.value(row)}
        prevValue={col.prevValue?.(row) ?? null}
        format={col.format}
        invertDelta={col.invertDelta}
        mode="inline"
      />
    );
  }

  if (col.render) return col.render(row);

  return (row as Record<string, unknown>)[col.key] as ReactNode;
}
