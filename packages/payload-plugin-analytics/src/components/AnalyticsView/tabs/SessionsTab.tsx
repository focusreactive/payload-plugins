import type { SessionsFilters } from "../hooks/useAnalyticsParams";

export interface SessionsTabProps {
  filters: SessionsFilters;
  onFiltersChange: (next: Partial<SessionsFilters>) => void;
}

export function SessionsTab({ filters, onFiltersChange }: SessionsTabProps) {
  return (
    <div data-source={filters.source ?? "any"} onClick={() => onFiltersChange({})}>
      Sessions
    </div>
  );
}
