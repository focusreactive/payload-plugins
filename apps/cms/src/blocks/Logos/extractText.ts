import { joinText } from "@/lib/utils/text";
import type { LogosBlock } from "@/payload-types";

export function extractLogosText(block: LogosBlock): string {
  return joinText([block.label, ...(block.items ?? []).map((item) => item.link?.label)]);
}
