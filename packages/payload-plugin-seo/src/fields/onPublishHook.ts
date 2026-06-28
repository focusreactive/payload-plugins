import type { FieldHook } from "payload";
import { getPluginConfig } from "../config";
import { PLUGIN_NAME } from "../constants";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "../constants/generation";
import {
  compact,
  heading,
  html,
  image,
  link,
  paragraph,
  richText,
  video,
} from "../content/schema/helpers";
import { serialize } from "../content/schema/serialize";
import type { ContentHelpers, ExtractToolkit, SeoCollectionConfig } from "../types/config";
import type { RangeOverride } from "../measure/measure";
import { resolveApiKey } from "../server/generate/apiKey";
import { createServerResolveDocs } from "../server/generate/serverResolveDocs";
import { generateForField } from "../server/generate/generateForField";
import type { SeoFieldKind } from "../server/generate/prompts";

const helpers: ContentHelpers = {
  heading,
  paragraph,
  link,
  image,
  video,
  html,
  richText,
  compact,
};

const CONTEXT_KEY = "__fr_seo_content__";

function isEmpty(v: unknown): boolean {
  return typeof v !== "string" || v.trim().length === 0;
}

function rangeFor(kind: SeoFieldKind, override: RangeOverride | undefined) {
  const base = kind === "title" ? TITLE_RANGE : DESCRIPTION_RANGE;

  return {
    min: override?.min ?? base.min,
    max: override?.max ?? base.max,
    unit: (kind === "title" ? "px" : "char") as "px" | "char",
  };
}

export function makeGenerateOnPublishHook(args: {
  kind: SeoFieldKind;
  range: RangeOverride | undefined;
}): FieldHook {
  return async ({ value, data, collection, req, operation }) => {
    if (!isEmpty(value)) return value;
    if (operation !== "create" && operation !== "update") return value;

    const status = (data as { _status?: string } | undefined)?._status;
    if (status && status !== "published") return value;

    const config = getPluginConfig();
    const apiKey = resolveApiKey(config.generation);
    if (!apiKey) return value;

    const slug = collection?.slug;
    const seoCfg = config.collections.find((c: SeoCollectionConfig) => c.slug === slug);
    const extractor = seoCfg?.serverExtractContent;
    if (!extractor || !slug) return value;

    try {
      const localeCode = typeof req.locale === "string" ? req.locale : undefined;

      const bucket = (req.context[CONTEXT_KEY] ??= {}) as Record<string, string>;
      const cacheKey = `${slug}:${localeCode ?? ""}`;
      let contentHtml = bucket[cacheKey];
      if (contentHtml === undefined) {
        const toolkit: ExtractToolkit = {
          resolveDocs: createServerResolveDocs(req.payload, localeCode),
          helpers,
        };
        const ir = await extractor(
          data as Record<string, unknown>,
          { locale: localeCode },
          toolkit
        );
        contentHtml = serialize(ir);
        bucket[cacheKey] = contentHtml;
      }

      return await generateForField({
        kind: args.kind,
        contentHtml,
        range: rangeFor(args.kind, args.range),
        locale: localeCode,
        config: config.generation ?? {},
        apiKey,
      });
    } catch (err) {
      req.payload.logger.error(
        `[${PLUGIN_NAME}] on-publish generation failed: ${(err as Error).message}`
      );

      return value;
    }
  };
}
