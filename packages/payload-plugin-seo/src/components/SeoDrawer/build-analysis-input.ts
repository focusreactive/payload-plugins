import type { ClientField } from "payload";
import type { ContentNode } from "../../content/schema/nodes";
import { serialize } from "../../content/schema/serialize";
import { extractContent } from "../../content/extract/extract";
import type { ExtractContext } from "../../content/extract/context";
import { collectRefs } from "../../content/resolve/collect-refs";
import { hydrate } from "../../content/resolve/hydrate";
import type { DocResolver } from "../../content/resolve/resolver";
import type { ResolvedDoc } from "../../content/resolve/types";
import { makeExcluded, makeIncluded } from "../../content/extract/selection";
import type { AnalysisInput } from "../../engine/types/analysis";
import type { ContentExtractor, ContentSelection, SeoFieldPaths } from "../../types/config";
import { buildInput } from "./buildInput";

export interface BuildAnalysisInputArgs {
  values: Record<string, unknown>;
  locale: string | { code?: string } | null | undefined;
  payloadLocale: string | undefined;
  apiRoute?: string;
  keyphrase: string;
  fields: SeoFieldPaths;
  site: { name: string; baseUrl: string };
  hostFields: ClientField[];
  ctx: ExtractContext;
  resolver: DocResolver;
  resolveDepth: number;
  override?: ContentExtractor;
}

function normalizeSelection(content: SeoFieldPaths["content"]): {
  include: string[];
  exclude: string[];
} {
  if (content == null) return { include: [], exclude: [] };
  if (typeof content === "string") return { include: [content], exclude: [] };
  const sel = content as ContentSelection;
  return { include: sel.include ?? [], exclude: sel.exclude ?? [] };
}

function metadataPaths(fields: SeoFieldPaths): string[] {
  return [fields.seoTitle, fields.metaDescription, fields.slug ?? "slug"].filter((p): p is string => p !== undefined);
}

export async function buildAnalysisInput(args: BuildAnalysisInputArgs): Promise<AnalysisInput> {
  const ir = await extractIntermediateRepresentation(args);
  const contentHtml = serialize(ir);

  return buildInput({
    values: args.values,
    contentHtml,
    locale: args.locale,
    keyphrase: args.keyphrase,
    fields: args.fields,
    site: args.site,
  });
}

async function extractIntermediateRepresentation(args: BuildAnalysisInputArgs): Promise<ContentNode[]> {
  const selection = normalizeSelection(args.fields.content);
  const meta = metadataPaths(args.fields);

  if (args.fields.content == null) return [];

  const excluded = makeExcluded(meta, selection.exclude);
  const included = makeIncluded(selection.include);
  const prune = (path: string) => excluded(path) || !included(path);

  const refs = args.resolveDepth >= 1 ? collectRefs(args.values, args.hostFields, args.ctx, prune) : [];
  const resolved = refs.length > 0 ? await args.resolver.resolve(refs, args.payloadLocale, args.resolveDepth - 1) : new Map<string, ResolvedDoc>();

  const ctx: ExtractContext = { ...args.ctx, resolved };

  if (args.override) return await args.override(hydrate(args.values, args.hostFields, ctx, resolved), { locale: args.payloadLocale, apiRoute: args.apiRoute });

  return extractContent({
    values: args.values,
    fields: args.hostFields,
    ctx,
    selection,
    metadataPaths: meta,
    depth: args.resolveDepth,
  });
}
