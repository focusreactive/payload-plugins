import type { CompletionFn } from "@focus-reactive/payload-plugin-translator";

/** `<1>text</1>` or `<1/>` — the marked wire format, as the core writes it. */
const MARK = /<(\d+)>([\s\S]*?)<\/\1>|<(\d+)\/>/gu;

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

type Mark = { id: string; text: string | null };

const parseMarks = (value: string): Mark[] =>
  [...value.matchAll(MARK)].map((m) =>
    m[3] === undefined ? { id: m[1] as string, text: m[2] as string } : { id: m[3], text: null }
  );

const render = (marks: Mark[]): string =>
  marks.map((m) => (m.text === null ? `<${m.id}/>` : `<${m.id}>${m.text}</${m.id}>`)).join("");

/** How the fake should mangle a marked reply, for specs that exercise the fallback. */
export type MarkCorruption = "drop" | "repeat" | "unclosed";

const corrupted = (marks: Mark[], how: MarkCorruption): string => {
  if (how === "drop") return render(marks.slice(1));
  if (how === "repeat") return render([...marks, marks[0] as Mark]);
  return `${render(marks)}<${marks[0]?.id ?? 1}>`;
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
 *
 * A value carrying numbered marks is understood rather than mangled: each mark comes back exactly
 * once with its own text translated, and — unless asked otherwise — in reverse order, because
 * reordering is the whole point of the marked format and a fake that preserved order would leave
 * the feature untested.
 */
export const fakeComplete =
  (options?: FakeTranslationOptions): CompletionFn =>
  ({ systemPrompt, userContent }) => {
    const locale = targetLocaleOf(systemPrompt);
    const input = JSON.parse(userContent) as Record<string, string>;
    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(input)) {
      const marks = parseMarks(value);
      if (marks.length === 0) {
        out[key] = translated(locale, value);
        continue;
      }

      const done = marks.map((m) => ({
        ...m,
        text: m.text === null ? null : translated(locale, m.text),
      }));
      const ordered = options?.keepMarkOrder ? done : [...done].reverse();
      out[key] = options?.corrupt ? corrupted(ordered, options.corrupt) : render(ordered);
    }

    return Promise.resolve(JSON.stringify(out));
  };

export const failingComplete: CompletionFn = () => {
  throw new Error("forced translation failure");
};
