import type { FormBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractFormText(block: FormBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.description,
    ...(block.fields ?? []).map((field) => field.label),
    block.consentText,
  ]);
}
