import type { VideoEmbedBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractVideoEmbedText(block: VideoEmbedBlock): string {
  return joinText([block.eyebrow, block.heading, block.description, block.title]);
}
