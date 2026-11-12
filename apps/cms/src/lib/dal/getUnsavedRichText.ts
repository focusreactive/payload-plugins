import { readUnsavedRichText } from "@focus-reactive/payload-plugin-visual-editing";
import type { LiveRichTextField } from "@focus-reactive/payload-plugin-visual-editing";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { draftMode, headers } from "next/headers";
import type { CollectionSlug } from "payload";

import { getPayloadClient } from "@/dal/payload-client";

import { PAGE_RENDER_DEPTH } from "./getPageBySlug";

const PAGE_COLLECTION: CollectionSlug = "page";

const renderDepthOf = ({ collectionSlug, kind }: LiveRichTextField) =>
  kind === "collection" && collectionSlug === PAGE_COLLECTION ? PAGE_RENDER_DEPTH : undefined;

export async function getUnsavedRichText(request: unknown): Promise<SerializedEditorState | null> {
  const { isEnabled: isDraftMode } = await draftMode();
  if (!isDraftMode) {
    return null;
  }

  return readUnsavedRichText<SerializedEditorState>({
    depth: renderDepthOf,
    headers: await headers(),
    payload: await getPayloadClient(),
    request,
  });
}
