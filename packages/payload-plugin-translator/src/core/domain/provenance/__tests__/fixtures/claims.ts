import type { SourceHash } from "../../../content-projection/computeFieldFingerprints.js";
import { HASH_LENGTH } from "../../../content-projection/computeFieldFingerprints.js";

const SEED_PATTERN = new RegExp(`^[0-9a-f]{1,${HASH_LENGTH}}$`, "u");

export const asHash = (seed: string): SourceHash => {
  if (!SEED_PATTERN.test(seed)) {
    throw new TypeError(
      `asHash needs a hex seed of 1 to ${HASH_LENGTH} characters, so two seeds cannot pad to the same hash: got "${seed}"`
    );
  }
  return seed.padEnd(HASH_LENGTH, "0") as SourceHash;
};
