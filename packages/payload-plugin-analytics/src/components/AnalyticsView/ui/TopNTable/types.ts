import type { ReactNode } from "react";

export interface TopNTableColumn<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  font?: "body" | "mono";
  muted?: boolean;
  render?: (row: Row) => ReactNode;
  value?: (row: Row) => number;
  prevValue?: (row: Row) => number | null;
  format?: (n: number) => string;
  invertDelta?: boolean;
}
