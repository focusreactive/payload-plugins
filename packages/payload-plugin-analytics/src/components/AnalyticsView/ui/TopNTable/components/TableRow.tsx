import { cn } from "../../../../../utils/style";
import { renderCell } from "../utils/renderCell";
import type { TopNTableColumn } from "../types";

export interface TableRowProps<Row> {
  row: Row;
  columns: TopNTableColumn<Row>[];
}

export function TableRow<Row>({ row, columns }: TableRowProps<Row>) {
  return (
    <tr className="hover:bg-(--theme-elevation-50)">
      {columns.map((col) => (
        <td
          key={col.key}
          className={cn(
            "p-2 border-b border-(--theme-elevation-100)",
            col.align === "right" && "text-right tabular-nums",
            col.font === "mono" && "font-mono text-xs",
            col.muted && "text-(--theme-elevation-500)"
          )}
        >
          {renderCell(col, row)}
        </td>
      ))}
    </tr>
  );
}
