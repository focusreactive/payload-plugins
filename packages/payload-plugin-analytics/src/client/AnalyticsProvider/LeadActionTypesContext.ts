"use client";

import { createContext, useContext } from "react";
import { BUILT_IN_LEAD_ACTION_TYPES } from "../../constants/events";

const FALLBACK: readonly string[] = BUILT_IN_LEAD_ACTION_TYPES;

export const LeadActionTypesContext = createContext<readonly string[]>(FALLBACK);

export function useLeadActionTypes(): readonly string[] {
  return useContext(LeadActionTypesContext);
}
