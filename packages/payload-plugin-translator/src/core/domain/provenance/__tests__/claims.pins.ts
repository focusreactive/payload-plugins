/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { SourceHash } from "../../content-projection/computeFieldFingerprints.js";
import type { RecordedClaim } from "../SourceFingerprint.js";
import { UNANSWERED } from "../SourceFingerprint.js";

declare const recorded: RecordedClaim;

// @ts-expect-error a bare string is not a SourceHash
const _bareString: SourceHash = "aaaaaaaaaaaaaaaa";

// @ts-expect-error a claim is not a hash until the marker is ruled out
const _unnarrowedClaim: SourceHash = recorded;

const _nonHashClaim: RecordedClaim = UNANSWERED;
