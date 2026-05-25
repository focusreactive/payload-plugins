import type { Payload } from "payload";

export function getLocales(payload: Payload): (string | undefined)[] {
  const { localization } = payload.config;

  if (!localization) return [undefined];

  const { locales } = localization;

  if (!locales?.length) return [undefined];

  return locales.map((l) => (typeof l === "string" ? l : l.code));
}
