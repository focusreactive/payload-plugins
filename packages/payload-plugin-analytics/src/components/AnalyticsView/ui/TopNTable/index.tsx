import { useState } from "react";
import { SkeletonBlock } from "../SkeletonBlock";
import { ErrorTile } from "../ErrorTile";
import { EmptyTile } from "../EmptyTile";
import { TableHeader } from "./components/TableHeader";
import { TableRow } from "./components/TableRow";
import { ExpandButton } from "./components/ExpandButton";
import type { BlockStateProps } from "../../types/blockState";
import type { TopNTableColumn } from "./types";

interface TopNTableProps<Row> extends BlockStateProps {
  rows: Row[];
  columns: TopNTableColumn<Row>[];
  initialVisible?: number;
  emptyMessage?: string;
}

export function TopNTable<Row extends object>({
  rows,
  columns,
  initialVisible = 5,
  emptyMessage = "No data in this range.",
  loading,
  error,
  onRetry,
}: TopNTableProps<Row>) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <SkeletonBlock shape="table" rows={initialVisible} />;
  if (error) return <ErrorTile error={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyTile message={emptyMessage} />;

  const visible = expanded ? rows : rows.slice(0, initialVisible);

  return (
    <div>
      <table className="w-full border-collapse text-[12.5px]">
        <TableHeader columns={columns} />

        <tbody>
          {visible.map((row, i) => (
            <TableRow key={i} row={row} columns={columns} />
          ))}
        </tbody>
      </table>

      {rows.length > initialVisible && (
        <ExpandButton expanded={expanded} total={rows.length} onToggle={() => setExpanded((e) => !e)} />
      )}
    </div>
  );
}
