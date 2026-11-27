export type SourceLocaleQuestion = {
  configured: string | undefined;
  localization: { defaultLocale?: string } | false | undefined;
};

export type ResolvedTargets = {
  targets: string[];
  droppedUnknown: string[];
  droppedSource: boolean;
};

export function isKnown(locale: string, known: Set<string>): boolean {
  return known.has(locale);
}

export function dedupe(locales: string[]): string[] {
  return [...new Set(locales)];
}

export function dropUnknown(
  locales: string[],
  known: Set<string>
): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const locale of locales) {
    (isKnown(locale, known) ? kept : dropped).push(locale);
  }
  return { kept, dropped };
}

export function excludeSource(
  targets: string[],
  source: string
): { kept: string[]; wasPresent: boolean } {
  const kept = targets.filter((target) => target !== source);
  return { kept, wasPresent: kept.length !== targets.length };
}

export type LocalizationLike = false | { locales: Array<string | { code: string }> };

export function knownCodes(localization: LocalizationLike | undefined): Set<string> | null {
  if (!localization) return null;
  return new Set(
    localization.locales.map((locale) => (typeof locale === "string" ? locale : locale.code))
  );
}

export function resolveTargets(args: {
  target_lng: string | string[];
  source_lng: string;
  knownLocales: Set<string>;
}): ResolvedTargets {
  const { target_lng, source_lng, knownLocales } = args;
  const requested = Array.isArray(target_lng) ? target_lng : [target_lng];
  const { kept: withoutSource, wasPresent: droppedSource } = excludeSource(
    dedupe(requested),
    source_lng
  );
  const { kept: targets, dropped: droppedUnknown } = dropUnknown(withoutSource, knownLocales);
  return { targets, droppedUnknown, droppedSource };
}

export function resolveSource({
  configured,
  localization,
}: SourceLocaleQuestion): string | undefined {
  if (configured !== undefined) return configured;
  return localization ? localization.defaultLocale : undefined;
}
