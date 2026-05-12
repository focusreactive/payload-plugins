import type { Comparison } from "../../../types/query";

export function OverviewTab({ comparison }: { comparison: Comparison }) {
  return <div data-comparison={comparison.kind}>Overview</div>;
}
