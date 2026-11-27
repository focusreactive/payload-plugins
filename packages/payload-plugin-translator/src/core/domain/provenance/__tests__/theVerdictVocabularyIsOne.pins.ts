/**
 * Never imported and never run (`vitest.config.ts` collects `*.test.ts`): `check-types` is what
 * fails when the engine's verdict words and the admin's published ones part ways.
 */

import type { LeafVerdict as Published } from "../../../../types/wire/DocumentTranslationState.js";
import type { LeafVerdict as Decided } from "../leafVerdicts.js";

declare const decided: Decided;
declare const published: Published;

const _theAdminReadsWhatTheEngineDecides: Published = decided;
const _theEngineDecidesWhatTheAdminReads: Decided = published;
