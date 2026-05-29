import { standardNormalCdf } from "./standardNormalCdf";

/** Per-variant confidence that the variant beats control: Φ(zScore), in [0,1]. */
export function confidence(zScore: number) {
  return standardNormalCdf(zScore);
}
