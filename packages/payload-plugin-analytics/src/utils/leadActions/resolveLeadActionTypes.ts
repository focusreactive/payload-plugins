import { BUILT_IN_LEAD_ACTION_TYPES } from "../../constants/events";
import type { LeadActionType } from "../../types/leadActions";

export function resolveLeadActionTypes(input: LeadActionType[] | undefined): LeadActionType[] {
  if (input === undefined) return [...BUILT_IN_LEAD_ACTION_TYPES];

  return Array.from(new Set(input));
}
