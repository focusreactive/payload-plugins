import type { ClientField } from "payload";
import type { ContentNode } from "../../content/schema/nodes";
import { serialize } from "../../content/schema/serialize";
import { extractContent } from "../../content/extractContent";
import { collectUploadRefs } from "../../content/uploads/collect-upload-refs";
import { hydrateUploadValues } from "../../content/uploads/hydrate-values";
import type { MediaResolver } from "../../content/uploads/media-resolver";
import type { UploadWalkContext } from "../../content/uploads/transform-upload-values";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { ContentExtractor, SeoFieldPaths } from "../../types/config";
import { buildInput } from "./buildInput";

export interface BuildAnalysisInputArgs {
  values: Record<string, unknown>;
  locale: string | { code?: string } | null | undefined;
  payloadLocale: string | undefined;
  keyphrase: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  schemaFields: ClientField[];
  walkCtx: UploadWalkContext;
  resolver: MediaResolver;
  override?: ContentExtractor;
}

async function hydrate(args: BuildAnalysisInputArgs): Promise<Record<string, unknown>> {
  const refs = collectUploadRefs(args.values, args.schemaFields, args.walkCtx);
  if (refs.length === 0) return args.values;

  const resolved = await args.resolver.resolve(refs, args.payloadLocale);
  return hydrateUploadValues(args.values, args.schemaFields, args.walkCtx, resolved);
}

async function extractIntermediateRepresentation(args: BuildAnalysisInputArgs): Promise<ContentNode[]> {
  const hydrated = await hydrate(args);
  if (args.override) return await args.override(hydrated);

  return extractContent(hydrated, args.fields);
}

export async function buildAnalysisInput(args: BuildAnalysisInputArgs): Promise<AnalysisInput> {
  const intermediateRepresentation = await extractIntermediateRepresentation(args);
  const contentHtml = serialize(intermediateRepresentation);

  return buildInput({
    values: args.values,
    contentHtml,
    locale: args.locale,
    keyphrase: args.keyphrase,
    fields: args.fields,
    site: args.site,
  });
}
