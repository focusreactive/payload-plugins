import type { Comparison } from "../../../types/query";

export function LeadActionsTab({ comparison }: { comparison: Comparison }) {
  return <div data-comparison={comparison.kind}>Lead Actions</div>;
}
