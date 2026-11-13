import type { Locale } from "@/lib/types";
import type { Footer, Header } from "@/payload-types";

/** What every record-driven page template receives. */
export interface EntityTemplateProps<TDoc> {
  doc: TDoc;
  locale: Locale;
  /** The page's path without the locale prefix, for example /locations/texas/allen. */
  path: string;
  header: Header | null;
  footer: Footer | null;
}
