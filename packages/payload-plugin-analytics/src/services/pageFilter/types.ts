export interface PageFilterContext {
  /** Currently-existing refs ("collection:id" + synthetic). */
  refs: string[];
  /** GA4 dimension api name for page ref (e.g. "customEvent:fr_page_ref"). */
  pageRefDim: string;
  /** GA4 dimension api name for content locale. */
  contentLocaleDim: string;
}
