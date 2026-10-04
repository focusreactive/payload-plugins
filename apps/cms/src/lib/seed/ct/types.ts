/** Shapes produced by parseDump.ts and consumed by the CT seed steps. */

export type TemplateCode = `T-${string}`;

export interface DumpEntry {
  /** "2.8", "3.141" — the number in the "## <n>.<m> <Title>" heading. */
  number: string;
  /** The entry title (page H1). */
  title: string;
  url: string;
  /** Path of `url`, lowercased, without trailing slash ("/automotive.html"). */
  legacyPath: string;
  slug: string;
  titleTag: string | null;
  template: TemplateCode;
  /** Cleaned body Markdown, headings shifted so the body starts at h2. */
  markdown: string;
  /** A form stub (download/contact) was removed from the body. */
  hasDownloadForm: boolean;
}

export type ParsedPage = DumpEntry;

export interface ParsedPost extends DumpEntry {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  author: string;
  year: number;
  /** Position in the dump (tie-breaker for equal dates). */
  order: number;
}

export interface ParsedChrome {
  /** Section "# 1." verbatim. */
  raw: string;
  emails: string[];
  phones: string[];
  /** e.g. [{ label: "ISO 9001", certificate: "…" }] */
  certificates: { label: string; certificate: string | null }[];
  /** The legal line ("© … Ltd. … VAT No. …"). */
  legalLine: string | null;
}

export interface ParsedSite {
  /** Derived from the dominant Title-tag suffix ("Automotive | <company>"); never hard-coded. */
  companyName: string | null;
  chrome: ParsedChrome;
  pages: ParsedPage[];
  posts: ParsedPost[];
  authors: string[];
}

/** images-map.json (written by scrapeImages.ts; see docs/plans/2026-10-04-ct-demo-content.md). */
export interface MappedImage {
  src: string;
  local: string | null;
  alt: string;
  title: string | null;
  afterBlock: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  sha1: string | null;
  kind: "inline" | "splash" | "og";
}

export interface MappedPost {
  slug: string;
  sourceUrl: string;
  status: "ok" | "fetch-failed" | "no-body";
  httpStatus: number | null;
  title: string | null;
  blockCount: number;
  images: MappedImage[];
}

export interface ImagesMap {
  generatedAt: string;
  source: string;
  posts: MappedPost[];
}
