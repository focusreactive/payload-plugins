import type { AccessGuard } from "./types";

/**
 * Lets every request through, including one that carried no session at all.
 *
 * Pass this to say so on purpose. The translation endpoints write to the host's documents and spend
 * money at the translation provider, so the plugin refuses to start without a decision either way —
 * and "open" has to be written down rather than inherited by omission.
 *
 * @since 0.14.0
 */
export class AnyAccessGuard implements AccessGuard {
  async check(): Promise<boolean> {
    return true;
  }
}
