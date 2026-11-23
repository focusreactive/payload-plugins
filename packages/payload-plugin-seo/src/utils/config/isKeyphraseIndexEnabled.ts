import { DEFAULT_KEYPHRASE_INDEX } from "../../constants";
import type { SeoPluginConfig } from "../../types/config";

export function isKeyphraseIndexEnabled(config: Pick<SeoPluginConfig, "keyphraseIndex">): boolean {
  return config.keyphraseIndex ?? DEFAULT_KEYPHRASE_INDEX;
}
