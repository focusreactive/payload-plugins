import { readFile } from "node:fs/promises";
import path from "node:path";

import { detectMimeType } from "./detectMimeType";

export async function resolveSource(
  source: string,
  filenameOverride?: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const isUrl = source.startsWith("http://") || source.startsWith("https://");

  if (isUrl) {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const detectedMimeType = detectMimeType(buffer);
    const basename = path.basename(new URL(source).pathname);
    const filename =
      filenameOverride ??
      (basename || `upload-${Date.now()}.${detectedMimeType.ext}`);

    return {
      buffer,
      filename,
      mimeType: detectedMimeType.mime,
    };
  }

  let buffer: Buffer | null = null;
  try {
    buffer = await readFile(source);
  } catch (error) {
    throw new Error(
      `Failed to read local file "${source}": ${error instanceof Error ? error.message : String(error)}`, { cause: error }
    );
  }

  const detectedMimeType = detectMimeType(buffer);
  const filename = filenameOverride ?? path.basename(source);

  return {
    buffer,
    filename,
    mimeType: detectedMimeType.mime,
  };
}
