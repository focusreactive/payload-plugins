"use server";

import { getUnsavedRichText } from "@/dal";

import { RichTextBody } from "./Body";
import type { RichTextStyle } from "./Body";

export async function renderUnsavedRichText(style: RichTextStyle, request: unknown) {
  const content = await getUnsavedRichText(request);

  return content && <RichTextBody content={content} {...style} />;
}
