/** A collection label as a host writes it: text, text per language, or a function of the admin. */
export type LabelValue =
  | string
  | Record<string, string>
  | ((args: { i18n: unknown; t: unknown }) => string)
  | undefined;

/** What `plugin.ts` stores for one page collection's label in the Type column. */
export type TypeLabelSetting = {
  /** The label came from the plugin's `label` option, which wins over the collection's own. */
  explicit: boolean;
  /** The label at config time: the fallback when the collection's own cannot be read. */
  label: string;
};

/** A label as the admin language shows it, `""` when there is none. */
export const resolveLabelValue = (
  label: LabelValue,
  language: string,
  i18n?: { t?: unknown }
): string => {
  if (typeof label === "string") {
    return label;
  }
  if (typeof label === "function") {
    try {
      return label({ i18n, t: i18n?.t });
    } catch {
      return "";
    }
  }
  if (label && typeof label === "object") {
    return label[language] ?? label.en ?? Object.values(label)[0] ?? "";
  }

  return "";
};

/**
 * The Type column's labels for one request. A label the host gave the plugin stays; otherwise the
 * collection's own singular label is read in the admin language, so a collection labelled in
 * several languages shows the one the editor reads, not the first one in the config.
 */
export const resolveTypeLabels = (
  settings: Readonly<Record<string, TypeLabelSetting>>,
  singularLabelOf: (collectionSlug: string) => LabelValue,
  language: string,
  i18n?: { t?: unknown }
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(settings).map(([slug, setting]) => {
      const own = setting.explicit ? "" : resolveLabelValue(singularLabelOf(slug), language, i18n);

      return [slug, own === "" ? setting.label : own];
    })
  );
