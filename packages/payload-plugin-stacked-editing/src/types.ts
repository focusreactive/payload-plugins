export type StackedEditingOptions = {
  /** `"panel"` opens rows as stacked panels from collapsed cards; `"inline"` keeps Payload's rows and opens panels from the row icon. Default `"panel"`. */
  defaultMode?: "panel" | "inline";
  /** Show rows as preview cards configured with `admin.custom.preview`. Default `true`. */
  cards?: boolean;
  /** Set `false` to keep the plugin in the config but switch it off. Default `true`. */
  enabled?: boolean;
  /** Collection slugs that get stacked editing. Default: every collection. */
  collections?: string[];
  /** Global slugs that get stacked editing. Default: every global. */
  globals?: string[];
};
