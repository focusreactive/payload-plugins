import {
  PayloadLink,
  SetStepNav,
  useConfig,
  useLocale,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
  useTranslation,
} from "@payloadcms/ui";
import { ListHeader } from "@payloadcms/ui/elements/ListHeader";
import { useCallback } from "react";

import type { FoldersTranslationKey } from "../translations/index.js";

/**
 * The one place the admin touches Payload's router, links, config and translations. A build for
 * another Payload major replaces this file and nothing else (spec section 7.13). No `next/*`
 * import: Payload's own router adapter works under any host framework.
 */
export {
  ListHeader,
  PayloadLink as Link,
  SetStepNav,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
};

/** The admin locale code, or `null` when localization is off (`useLocale` is nullable in 4.x). */
export const useLocaleCode = (): string | null => useLocale()?.code ?? null;

/** Where the admin and the REST API live, as the host configured them. */
export const useAdminRoutes = (): { adminRoute: string; apiBaseUrl: string } => {
  const { config } = useConfig();

  return {
    adminRoute: config.routes.admin,
    apiBaseUrl: `${config.serverURL ?? ""}${config.routes.api}`,
  };
};

export type Translate = (
  key: FoldersTranslationKey,
  variables?: Record<string, number | string>
) => string;

/** `t` for the plugin's own strings, which Payload's typed `t` does not know about. */
export const useFoldersTranslation = (): { language: string; translate: Translate } => {
  const { i18n, t } = useTranslation();
  const translate = useCallback<Translate>(
    (key, variables) =>
      (t as unknown as (name: string, values?: Record<string, number | string>) => string)(
        `foldersTree:${key}`,
        variables
      ),
    [t]
  );

  return { language: i18n.language, translate };
};

/** The URL of a document's edit view. */
export const editViewUrl = (adminRoute: string, collection: string, id: number | string): string =>
  `${adminRoute}/collections/${collection}/${id}`;
