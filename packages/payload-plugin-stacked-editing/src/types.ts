export type StackedEditingOptions = {
  /**
   * How rows behave when the document opens.
   * - `"panel"` (default): every array/blocks row starts as a collapsed card; a click on its header
   *   opens it in a panel, the chevron still expands it inline.
   * - `"inline"`: Payload's own behaviour (rows expand inline); the "open" icon in a row header
   *   opens the row in a panel.
   */
  defaultMode?: "panel" | "inline";
  /**
   * Show rows as preview cards (thumbnail, title, subtitle) in their headers: sets the plugin's
   * `CardLabel` as `RowLabel` of array fields and `Label` of blocks that have no label of their
   * own. Configure a card with `admin.custom.preview` (see `definePreview`). Default: `true`.
   */
  cards?: boolean;
  /**
   * Turn the plugin off without removing it from the config (the admin goes back to Payload's
   * inline collapsibles). Default: `true`.
   */
  enabled?: boolean;
  /**
   * Collection slugs that get stacked editing. Default: every collection.
   */
  collections?: string[];
  /**
   * Global slugs that get stacked editing. Default: every global.
   */
  globals?: string[];
};
