import type { Visualization } from "./visualization";

export type Status = "good" | "warn" | "bad";

export type TotalStatus = Status | "idle";

export interface CheckResult {
  id: string;
  status: Status;
  score: number;
  recommendation?: string;
  data?: Record<string, unknown>;
  viz?: Visualization;
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

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingNode {
  id: string;
  level: HeadingLevel;
  text: string;
  children: HeadingNode[];
}

export interface HeadingLevelCount {
  level: HeadingLevel;
  count: number;
}

export interface HeadingStructure {
  total: number;
  levels: HeadingLevelCount[];
  tree: HeadingNode[];
}

export interface VitalsResult {
  words: number;
  sentences: number;
  paragraphs: number;
  images: number;
  videos: number;
  readingTimeMinutes: number;
  prominentWords: ProminentWord[];
  headings: HeadingStructure;
}

export interface SerpResult {
  title: string;
  url: string;
  description: string;
  siteName: string;
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
