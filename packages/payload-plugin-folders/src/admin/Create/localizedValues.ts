/** The content locales a create is made in. Both are `null` when the site is not localized. */
export type CreateLocales = { current: string | null; default: string | null };

/**
 * Where a new item's typed text goes (spec section 8). The plugin needs a name and a slug in the
 * default locale, and every other locale falls back to it, so an item created while the admin shows
 * another locale gets the typed text in that locale and in the default one: the default slot is
 * what the other locales fall back to, and what a folder or a published page cannot do without. The
 * editor translates the default locale's text afterwards. With one request in the locale `all` the
 * item is whole or not made at all.
 *
 * `localizedFields` names the fields that hold one value per locale. A field that does not is sent
 * as it is; with localization off, or while the admin shows the default locale, nothing changes
 * but the locale the request names.
 */
export const localizeNewValues = ({
  locales,
  localizedFields,
  values,
}: {
  locales: CreateLocales;
  localizedFields: ReadonlySet<string>;
  values: Record<string, unknown>;
}): { body: Record<string, unknown>; locale: string | null } => {
  const { current, default: defaultLocale } = locales;
  if (current === null || defaultLocale === null) {
    return { body: values, locale: null };
  }
  if (current === defaultLocale) {
    return { body: values, locale: current };
  }

  return {
    body: Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        name,
        localizedFields.has(name) ? { [defaultLocale]: value, [current]: value } : value,
      ])
    ),
    locale: "all",
  };
};

type ClientFieldLike = {
  fields?: ClientFieldLike[];
  localized?: boolean;
  name?: string;
  tabs?: Array<{ fields?: ClientFieldLike[]; name?: string }>;
  type?: string;
};

/**
 * The names among `names` that are localized fields of a collection, found through the layout
 * fields (rows, collapsibles, unnamed groups and tabs) that hold them. A field inside a named
 * group or tab is not at the top level of the body, so it is not looked for there.
 */
export const findLocalizedFields = (
  fields: readonly ClientFieldLike[],
  names: readonly string[]
): Set<string> => {
  const found = new Set<string>();
  const visit = (list: readonly ClientFieldLike[]) => {
    for (const field of list) {
      if (field.type === "tabs") {
        for (const tab of field.tabs ?? []) {
          if (tab.name === undefined && tab.fields) {
            visit(tab.fields);
          }
        }
      } else if (field.name === undefined && field.fields) {
        visit(field.fields);
      } else if (field.name !== undefined && names.includes(field.name) && field.localized) {
        found.add(field.name);
      }
    }
  };
  visit(fields);

  return found;
};
