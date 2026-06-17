import { getActiveExistingRefs } from "../../pageFilter/activeRefsHolder";

export const MOCK_MISSING_REF = "pages:__mock_deleted__";

const FALLBACK_EXISTING_REF = "__home";

const MAX_EXISTING = 3;

export function pickMockRefs(): { existing: string[]; missing: string } {
  const live = getActiveExistingRefs().filter((r) => r !== MOCK_MISSING_REF);
  const existing = live.length > 0 ? live.slice(0, MAX_EXISTING) : [FALLBACK_EXISTING_REF];
  return { existing, missing: MOCK_MISSING_REF };
}
