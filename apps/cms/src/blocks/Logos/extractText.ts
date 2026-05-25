import { joinText } from "@/core/utils/text";
import type { LogosBlock } from "@/payload-types";

export function extractLogosText(block: LogosBlock): string {
  return joinText((block.items ?? []).map((item) => item.link?.label));
}
