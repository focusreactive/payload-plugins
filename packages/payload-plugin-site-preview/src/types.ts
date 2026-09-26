import type { CollectionSlug, JsonObject, PayloadRequest } from "payload";

/** How to ask the site for a page. */
export type SiteRequest = {
  /** An address that answers with the page's html, rendered by the site's own templates. */
  url: string;
  headers?: Record<string, string>;
  /** The body of an unsaved render. Defaults to `{ "doc": <form data> }` as JSON. */
  body?: string;
  /**
   * The page's directory on the site (`nyc/`), which its relative urls resolve against. Defaults to
   * the response's `X-Preview-Base` header, then the site root.
   */
  basePath?: string;
};

export type SiteRequestArgs = {
  req: PayloadRequest;
  collection: CollectionSlug;
  id: number | string;
  /**
   * The editor's unsaved form data, read the way a stored document is (relationships populated,
   * `afterRead` hooks run), or null for the saved document. With data the plugin POSTs; without, GETs.
   */
  data: JsonObject | null;
};

export type SitePreviewOptions = {
  /** The collections whose documents are pages of the site. */
  collections: CollectionSlug[];
  /** Where the site renders a document; null when there is nothing to preview. */
  site: (args: SiteRequestArgs) => Promise<SiteRequest | null> | SiteRequest | null;
  /**
   * Room for the site's fixed header when the preview scrolls to a block: a length in px (`'80px'`),
   * or the header's selector (`'.header'`), measured at scroll time.
   */
  scrollOffset?: string;
  /** How deep relationships in unsaved form data are populated. Match what the site reads. Default 2. */
  depth?: number;
  /**
   * Render the editor's unsaved edits (a POST to the site). Default true. Turn it off for a site that
   * cannot render on request — a static host answering from its build — and point `site` at the
   * deployed page: the preview then shows the saved document, and click-to-edit still works.
   */
  unsaved?: boolean;
};
