import { decodeSegments, encodeSegments } from "@focus-reactive/payload-plugin-translator";
import type { CompletionFn } from "@focus-reactive/payload-plugin-translator";

/**
 * The prompt is the only place the target language reaches a completion function. Throwing rather
 * than defaulting is deliberate: a reworded prompt then breaks the suite loudly instead of
 * silently labelling every translation with the wrong locale.
 */
const targetLocaleOf = (systemPrompt: string): string => {
  const found = /\binto ([A-Za-z-]+)/u.exec(systemPrompt)?.[1];
  if (!found) throw new Error(`fakeComplete: no target locale in the system prompt`);
  return found;
};

const translated = (locale: string, text: string): string =>
  text.trim() ? `${locale}:${text}` : text;

type Mark = { id: number; text: string | null };

const parseMarks = (value: string): Mark[] => {
  const decoded = decodeSegments(value);
  if (!decoded.ok) throw new Error(`fakeComplete: a marked value did not decode — ${value}`);
  return decoded.segments;
};

/** How the fake should mangle a marked reply, for specs that exercise the fallback. */
export type MarkCorruption = "drop" | "repeat" | "unclosed";

const corrupted = (marks: Mark[], how: MarkCorruption): string => {
  if (how === "drop") return encodeSegments(marks.slice(1));
  if (how === "repeat") return encodeSegments([...marks, marks[0] as Mark]);
  return `${encodeSegments(marks)}<${marks[0]?.id ?? 1}>`;
};

export type FakeTranslationOptions = {
  /** Return marks in the order they were sent. Off by default: reordering is what marks are for. */
  keepMarkOrder?: boolean;
  /** Break every marked reply this way, so the caller has to keep the source text. */
  corrupt?: MarkCorruption;
};

/**
 * A stand-in for a translation service: deterministic, reaches no network, needs no API key.
 *
 * Every value comes back prefixed with the target locale, so a spec can tell *which* locale's
 * translation landed and can never mistake a hand-typed value for a translated one.
 */
export const fakeComplete =
  (options?: FakeTranslationOptions): CompletionFn =>
  ({ systemPrompt, userContent }) => {
    const locale = targetLocaleOf(systemPrompt);
    const input = JSON.parse(userContent) as {
      marked: Record<string, string>;
      plain: Record<string, string>;
    };
    const out = { marked: {} as Record<string, string>, plain: {} as Record<string, string> };

    for (const [key, value] of Object.entries(input.plain)) {
      out.plain[key] = translated(locale, value);
    }

    for (const [key, value] of Object.entries(input.marked)) {
      const done = parseMarks(value).map((m) => ({
        ...m,
        text: m.text === null ? null : translated(locale, m.text),
      }));
      const ordered = options?.keepMarkOrder ? done : [...done].reverse();
      out.marked[key] = options?.corrupt
        ? corrupted(ordered, options.corrupt)
        : encodeSegments(ordered);
    }

    return Promise.resolve(JSON.stringify(out));
  };

export const failingComplete: CompletionFn = () => {
  throw new Error("forced translation failure");
};
