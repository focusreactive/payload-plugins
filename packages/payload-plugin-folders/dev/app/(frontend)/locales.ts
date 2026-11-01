import config from "@payload-config";
import { getPayload } from "payload";

/**
 * The frontend's locale prefix rule, the one `buildUrl` applies with `localePrefix: "non-default"`:
 * the default locale has no prefix and every other locale has its code as the first path segment.
 */
export const splitLocalePrefix = async (
  segments: string[]
): Promise<{ locale: string; segments: string[] }> => {
  const payload = await getPayload({ config });
  const { defaultLocale, localeCodes } = payload.config.localization || {
    defaultLocale: "en",
    localeCodes: ["en"],
  };
  const [first, ...rest] = segments;
  if (first !== undefined && first !== defaultLocale && localeCodes.includes(first)) {
    return { locale: first, segments: rest };
  }

  return { locale: defaultLocale, segments };
};
