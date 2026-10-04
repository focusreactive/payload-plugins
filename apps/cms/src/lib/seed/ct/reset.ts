import type { SeedContext } from "./context";
import { log } from "./log";

/** `--reset`: removes what the seed owns. Each step registers its own cleanup here (T7–T9). */
export async function resetSeed(_ctx: SeedContext): Promise<void> {
  log.info("nothing to reset yet");
}
