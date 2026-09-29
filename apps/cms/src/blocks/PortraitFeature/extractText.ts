import type { PortraitFeatureBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractPortraitFeatureText(block: PortraitFeatureBlock): string {
  return joinText([block.personName, block.heading, block.description, block.link?.label]);
}
