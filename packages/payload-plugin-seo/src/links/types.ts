import type { UsageDoc } from "../keyphrases/usage";

export interface TextRange {
  start: number;
  end: number;
}

export interface LinkMatch {
  phrase: string;
  count: number;
  snippet: string;
  snippetMatch: TextRange;
}

export interface LinkSuggestion extends UsageDoc, LinkMatch {
  url: string | null;
}
