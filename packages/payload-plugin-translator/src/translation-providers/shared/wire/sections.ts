import type {
  Segment,
  SegmentId,
  TranslationInput,
  TranslationOutput,
} from "../../../core/domain/translation-providers/index.js";
import { canEncodeSegments, decodeSegments, encodeSegments } from "./inlineMarks.js";

export const SECTION_NAMES = ["marked", "plain"] as const;
export type Sections = Record<(typeof SECTION_NAMES)[number], Record<string, string>>;

const pieceKey = (key: string, id: number): string => `${key}.${id}`;
export const emptySections = (): Sections => ({ marked: {}, plain: {} });
export const indexOfKey = (key: string): number => Number(key.split(".")[0]);

export function toSections(input: TranslationInput): Sections {
  const sections = emptySections();
  for (const [key, value] of Object.entries(input)) {
    if (value.kind === "text") {
      sections.plain[key] = value.text;
    } else if (canEncodeSegments(value.segments)) {
      sections.marked[key] = encodeSegments(value.segments);
    } else {
      for (const segment of value.segments) {
        if (segment.text !== null) sections.plain[pieceKey(key, segment.id)] = segment.text;
      }
    }
  }
  return sections;
}

const assemblePieces = (
  key: string,
  segments: readonly Segment[],
  plain: Partial<Record<string, string>>
): { id: SegmentId; text: string }[] | undefined => {
  const answered: { id: SegmentId; text: string }[] = [];
  for (const segment of segments) {
    if (segment.text === null) {
      answered.push({ id: segment.id, text: "" });
      continue;
    }
    const text = plain[pieceKey(key, segment.id)];
    if (text === undefined) return undefined;
    answered.push({ id: segment.id, text });
  }
  return answered;
};

export function fromSections(input: TranslationInput, reply: Sections): TranslationOutput {
  const marked: Partial<Record<string, string>> = reply.marked;
  const plain: Partial<Record<string, string>> = reply.plain;
  const output: TranslationOutput = {};

  for (const [key, value] of Object.entries(input)) {
    const index = indexOfKey(key);
    if (value.kind === "text") {
      const text = plain[key];
      if (text !== undefined) output[index] = { kind: "text", text };
      continue;
    }

    if (!canEncodeSegments(value.segments)) {
      const segments = assemblePieces(key, value.segments, plain);
      if (segments) output[index] = { kind: "segments", segments };
      continue;
    }

    const encoded = marked[key];
    if (encoded === undefined) continue;
    const decoded = decodeSegments(encoded);
    output[index] = decoded.ok
      ? { kind: "segments", segments: decoded.segments }
      : { kind: "failed", code: "malformed" };
  }

  return output;
}
