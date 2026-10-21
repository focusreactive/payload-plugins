/**
 * Assertions the type-checker makes and the suite cannot. Nothing here runs: `check-types` fails if
 * any `@ts-expect-error` below stops being an error, which is what pins these guarantees.
 */

import type { SourceHash } from "../../content-projection/computeFieldFingerprints.js";
import type { RecordedClaim } from "../SourceFingerprint.js";
import { DECLINED, UNANSWERED } from "../SourceFingerprint.js";

declare const undeclined: Exclude<RecordedClaim, typeof DECLINED>;

// @ts-expect-error a bare string is not a SourceHash
const _bareString: SourceHash = "aaaaaaaaaaaaaaaa";

// @ts-expect-error a claim is not a hash until the marker is ruled out
const _unnarrowedClaim: SourceHash = undeclined;

const _nonHashClaims: RecordedClaim[] = [UNANSWERED, DECLINED];
