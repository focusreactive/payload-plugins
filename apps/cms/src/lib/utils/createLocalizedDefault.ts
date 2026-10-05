import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";

interface DefaultValueArgs {
  locale?: Locale;
  req: unknown;
  user: unknown;
}

interface RichTextState {
  root: {
    type: string;
    direction: "ltr";
    format: "";
    indent: number;
    version: number;
    children: unknown[];
  };
}

const DEFAULT_LOCALE = I18N_CONFIG.defaultLocale as Locale;

/**
 * Creates Lexical richText state from heading and paragraph text
 */
export function createRichTextState(heading: string, paragraph: string): RichTextState {
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: heading,
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          tag: "h2",
          type: "heading",
          version: 1,
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: paragraph,
              type: "text",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          textFormat: 0,
          type: "paragraph",
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

/**
 * Creates localized defaultValue function for simple fields (text, number, etc.)
 *
 * @example
 * defaultValue: createLocalizedDefault({ en: 'Hello', de: 'Hallo' })
 */
export function createLocalizedDefault<T>(
  // Only `en` is mandatory. A locale without its own translation gets no default, so an
  // untranslated document stays empty and reads fall back to the default-locale content
  // instead of storing English placeholder text under that locale.
  translations: Partial<Record<Locale, T>> & { en: T }
): (args: DefaultValueArgs) => T | undefined {
  return (args) => {
    const value = translations[args.locale ?? DEFAULT_LOCALE];
    return value === undefined ? undefined : structuredClone(value);
  };
}

/**
 * Creates localized defaultValue function for richText fields
 * Automatically converts { heading, paragraph } to Lexical state
 *
 * @example
 * defaultValue: createLocalizedRichText({
 *   en: { heading: 'Title', paragraph: 'Content' },
 *   de: { heading: 'Titel', paragraph: 'Inhalt' }
 * })
 */
export function createLocalizedRichText(
  translations: Partial<Record<Locale, { heading: string; paragraph: string }>> & {
    en: { heading: string; paragraph: string };
  }
): (args: DefaultValueArgs) => RichTextState | undefined {
  const richTextRecord = {} as Partial<Record<Locale, RichTextState>> & { en: RichTextState };

  for (const { code } of I18N_CONFIG.locales) {
    const locale = code as Locale;
    const t = translations[locale];
    if (t) {
      richTextRecord[locale] = createRichTextState(t.heading, t.paragraph);
    }
  }

  return createLocalizedDefault(richTextRecord);
}
