import { cn } from "../../../../../utils/style";
import type { TopNTableColumn } from "../types";

export interface TableHeaderProps<Row> {
  columns: TopNTableColumn<Row>[];
}

export function TableHeader<Row>({ columns }: TableHeaderProps<Row>) {
  return (
    <thead>
      <tr>
        {columns.map(({ key, header, align }) => (
          <th
            key={key}
            className={cn(
              "text-left p-2 text-[10px] tracking-widest uppercase text-(--theme-elevation-500) font-semibold border-b border-(--theme-border-color)",
              align === "right" && "text-right tabular-nums",
            )}>
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
