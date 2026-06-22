import { I18N_CONFIG } from "@/core/config/i18n";
import type { Page } from "@/payload-types";

import type { ABVariantData } from "./types";

export function buildVariantData(
  doc: Page & { _abPassPercentage?: number },
  locale: string | undefined
): ABVariantData {
  const breadcrumbs = doc.breadcrumbs ?? [];
  const lastUrl = breadcrumbs.at(-1)?.url ?? "";
  const restPath = !lastUrl || lastUrl === "/home" ? "" : lastUrl;
  const resolvedLocale = locale ?? I18N_CONFIG.defaultLocale;

  return {
    bucket: doc.slug,
    passPercentage: doc._abPassPercentage ?? 0,
    rewritePath: `/${resolvedLocale}${restPath}`,
  };
}
