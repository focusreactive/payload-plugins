"use server";

import { getUnsavedRichText } from "@/dal";

import { RichTextBody } from "./Body";
import type { RichTextRenderOptions } from "./Body";

export async function renderUnsavedRichText(options: RichTextRenderOptions, request: unknown) {
  const content = await getUnsavedRichText(request);

  return content && <RichTextBody content={content} {...options} />;
}
