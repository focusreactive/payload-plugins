export type Status = "good" | "warn" | "bad";

export type TotalStatus = Status | "idle";

export interface CheckResult {
  id: string;
  status: Status;
  score: number;
  recommendation?: string;
  data?: Record<string, unknown>;
}

export interface InclusiveFlag {
  term: string;
  suggestion: string;
  location: string;
}
export interface InclusiveCategory {
  name: string;
  flags: InclusiveFlag[];
}

export interface ProminentWord {
  word: string;
  count: number;
  isKeyphrase: boolean;
}

export interface VitalsResult {
  words: number;
  sentences: number;
  paragraphs: number;
  images: number;
  videos: number;
  readingTimeMinutes: number;
  prominentWords: ProminentWord[];
  internalLinkingPhrases: string[];
}

export interface SerpResult {
  title: string;
  url: string;
  description: string;
  siteName: string;
  titleWidthPx: number;
  descriptionChars: number;
}

export interface CategoryResult {
  ringScore: number;
  status: Status;
  checks: CheckResult[];
}

export interface AnalysisResult {
  overall: { seoScore: number; status: Status };
  keyphrase: CategoryResult;
  onPage: CategoryResult;
  readability: CategoryResult;
  inclusive: {
    ringScore: number;
    status: Status;
    categories: InclusiveCategory[];
    cleanCategories: string[];
  };
  vitals: VitalsResult;
  serp: SerpResult;
}

export interface AnalysisInput {
  title: string;
  slug: string;
  description: string;
  contentHtml: string;
  keyphrase: string;
  locale: string;
  site: { name: string; baseUrl: string };
  has: {
    seoTitle: boolean;
    metaDescription: boolean;
    slug: boolean;
    content: boolean;
  };
}
