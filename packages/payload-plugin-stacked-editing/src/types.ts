export type StackedEditingOptions = {
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
