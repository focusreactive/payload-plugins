import { vi } from "vitest";

import type { ModelRequest } from "../../AskModel.provider.js";
import type {
  TranslationInput,
  TranslationRequest,
} from "../../../../core/domain/translation-providers/index.js";

export function recordingAsk(reply: string) {
  const seen: ModelRequest[] = [];
  const askModel = vi.fn(async (request: ModelRequest) => {
    seen.push(request);
    return reply;
  });
  return { askModel, seen };
}

export const DEFAULT_DOCUMENT = { collection: "docs", id: "1" };

export function aRequest(over: Partial<TranslationRequest> = {}): TranslationRequest {
  return {
    sourceLng: "en",
    targetLng: "de",
    document: DEFAULT_DOCUMENT,
    ...over,
  };
}

export const texts = (values: Record<number, string>): TranslationInput =>
  Object.fromEntries(
    Object.entries(values).map(([key, text]) => [key, { kind: "text", text } as const])
  );

export const plainReply = (values: Record<string, unknown>): string =>
  JSON.stringify({ marked: {}, plain: values });
