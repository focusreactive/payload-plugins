import type { SeoFieldPaths } from "../types/config";
import { extractContent } from "./extractContent";

export type ExtractorFn = (data: Record<string, unknown>) => string;

export function resolveExtractor(override: ExtractorFn | undefined, fields: SeoFieldPaths): ExtractorFn {
  if (override) return override;

  return (data) => extractContent(data, fields);
}
