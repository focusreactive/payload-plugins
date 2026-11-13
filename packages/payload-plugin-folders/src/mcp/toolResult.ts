import { APIError } from "payload";

import type { FoldersMcpToolResponse } from "./types.js";

/** A short text block for the model and the same facts as `structuredContent`. */
export const toolSuccess = (
  text: string,
  structuredContent: Record<string, unknown>
): FoldersMcpToolResponse => ({
  content: [{ text, type: "text" }],
  structuredContent,
});

export const toolRefusal = (message: string): FoldersMcpToolResponse => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

/**
 * Runs a tool body and turns a refusal of the plugin or of Payload (an `APIError`, whose message
 * is already written for a person) into an error result the model reads. Anything else is a bug
 * and keeps propagating.
 */
export const runTool = async (
  body: () => Promise<FoldersMcpToolResponse>
): Promise<FoldersMcpToolResponse> => {
  try {
    return await body();
  } catch (error) {
    if (error instanceof APIError) {
      return toolRefusal(error.message);
    }
    throw error;
  }
};
