import type { ClientField } from "payload";
import { extractContent } from "../../content/extractContent";
import { collectUploadRefs } from "../../content/uploads/collect-upload-refs";
import { hydrateUploadValues } from "../../content/uploads/hydrate-values";
import type { MediaResolver } from "../../content/uploads/media-resolver";
import type { UploadWalkContext } from "../../content/uploads/transform-upload-values";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { ExtractorFn, SeoFieldPaths } from "../../types/config";
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
  override?: ExtractorFn;
}

async function extractWithUploads(args: BuildAnalysisInputArgs): Promise<string> {
  const refs = collectUploadRefs(args.values, args.schemaFields, args.walkCtx);
  if (refs.length === 0) return extractContent(args.values, args.fields);

  const resolved = await args.resolver.resolve(refs, args.payloadLocale);
  const hydrated = hydrateUploadValues(args.values, args.schemaFields, args.walkCtx, resolved);

  return extractContent(hydrated, args.fields);
}

export async function buildAnalysisInput(args: BuildAnalysisInputArgs): Promise<AnalysisInput> {
  const contentHtml = args.override ? await args.override(args.values) : await extractWithUploads(args);

  return buildInput({
    values: args.values,
    contentHtml,
    locale: args.locale,
    keyphrase: args.keyphrase,
    fields: args.fields,
    site: args.site,
  });
}
