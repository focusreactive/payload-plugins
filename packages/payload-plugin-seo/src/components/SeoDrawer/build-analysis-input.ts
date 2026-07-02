import type { ContentNode } from "../../content/schema/nodes";
import { serialize } from "../../content/schema/serialize";
import {
  compact,
  heading,
  html,
  image,
  link,
  paragraph,
  richText,
  video,
} from "../../content/schema/helpers";
import { createResolveDocs } from "../../content/resolve/resolve-docs";
import type { AnalysisInput, KeyphraseInput } from "../../engine/types/analysis";
import type {
  ContentExtractor,
  ContentHelpers,
  ExtractContext,
  ExtractToolkit,
  SeoFieldPaths,
} from "../../types/config";
import { buildInput } from "./buildInput";

const helpers: ContentHelpers = { heading, paragraph, link, image, video, html, richText, compact };

export interface BuildAnalysisInputArgs {
  values: Record<string, unknown>;
  locale: string | { code?: string } | null | undefined;
  payloadLocale: string | undefined;
  apiRoute?: string;
  keyphrases: KeyphraseInput[];
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  extractor?: ContentExtractor;
}

export async function buildAnalysisInput(args: BuildAnalysisInputArgs): Promise<AnalysisInput> {
  const ir = await extractIntermediateRepresentation(args);
  const contentHtml = serialize(ir);

  return buildInput({
    values: args.values,
    contentHtml,
    locale: args.locale,
    keyphrases: args.keyphrases,
    fields: args.fields,
    site: args.site,
  });
}

async function extractIntermediateRepresentation(
  args: BuildAnalysisInputArgs
): Promise<ContentNode[]> {
  if (!args.extractor) return [];

  const ctx: ExtractContext = {
    locale: args.payloadLocale,
    apiRoute: args.apiRoute,
  };

  const toolkit: ExtractToolkit = {
    resolveDocs: createResolveDocs(args.apiRoute, args.payloadLocale),
    helpers,
  };

  return await args.extractor(args.values, ctx, toolkit);
}
