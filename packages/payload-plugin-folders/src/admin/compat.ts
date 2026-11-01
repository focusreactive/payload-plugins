import {
  PayloadLink,
  SetStepNav,
  useAuth,
  useConfig,
  useLocale,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
  useTranslation,
} from "@payloadcms/ui";
import { ListHeader } from "@payloadcms/ui/elements/ListHeader";
import { useCallback, useMemo } from "react";

import type { FoldersTranslationKey } from "../translations/index.js";
import { findLocalizedFields } from "./Create/localizedValues.js";

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

/** The signed-in user's id, `null` while signed out. */
export const useUserId = (): number | string | null => useAuth().user?.id ?? null;

/**
 * Whether the signed-in user may create documents in a collection, from the admin's own
 * permissions (the tree rows carry no `create` flag). Before the permissions have loaded it says
 * yes: the server checks again whatever the button allowed.
 */
export const useCanCreate = (): ((collection: string) => boolean) => {
  const { permissions } = useAuth();

  return useCallback(
    (collection: string) =>
      permissions?.collections === undefined
        ? true
        : permissions.collections[collection]?.create === true,
    [permissions]
  );
};

/** The admin locale code, or `null` when localization is off (`useLocale` is nullable in 4.x). */
export const useLocaleCode = (): string | null => useLocale()?.code ?? null;

/**
 * The content locale the admin shows and the site's default locale, for a create that has to name
 * both (spec section 8); `null` for each when localization is off.
 */
export const useContentLocales = (): { current: string | null; default: string | null } => {
  const { config } = useConfig();
  const current = useLocale()?.code ?? null;

  return {
    current,
    default: config.localization ? config.localization.defaultLocale : null,
  };
};

/** The names among `names` that are localized top-level fields of a collection, as the admin knows it. */
export const useLocalizedFieldNames = (
  collectionSlug: string,
  names: readonly string[]
): ReadonlySet<string> => {
  const { getEntityConfig } = useConfig();
  const fields = getEntityConfig({ collectionSlug })?.fields;

  return useMemo(
    () => findLocalizedFields((fields ?? []) as Parameters<typeof findLocalizedFields>[0], names),
    // `names` is a literal list at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, names.join("|")]
  );
};

/** How many languages the admin has; 1 when localization is off. */
export const useLocaleCount = (): number => {
  const { config } = useConfig();

  return config.localization ? config.localization.locales.length : 1;
};

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
