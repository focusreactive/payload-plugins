import type { Config } from "payload";
import { getComponentPath } from "./getComponentPath";
import type { SeoPluginConfig, SeoSiteConfig } from "../../types/config";

function normalizeDepth(depth: number | undefined): number {
  if (depth === undefined) return 2;

  return Number.isFinite(depth) && depth >= 0 ? Math.floor(depth) : 0;
}

export function overrideAdmin(incomingConfig: Config, config: SeoPluginConfig): Config {
  const bySlug = new Map(config.collections.map((c) => [c.slug, c]));
  const site: SeoSiteConfig = config.site ?? {};
  const slugPaths = Object.fromEntries(config.collections.map((c) => [c.slug, c.fields?.slug ?? "slug"]));

  const collections = (incomingConfig.collections ?? []).map((collection) => {
    const seoCfg = bySlug.get(collection.slug);
    if (!seoCfg) return collection;

    const buttonEntry = {
      path: getComponentPath("components/SeoButton"),
      clientProps: {
        collectionSlug: collection.slug,
        fields: seoCfg.fields ?? {},
        extractContentPath: seoCfg.extractContentPath ?? null,
        site: {
          name: site.name ?? "",
          baseUrl: site.baseUrl ?? "",
          faviconUrl: site.faviconUrl ?? "",
        },
        supportedLocales: config.supportedLocales ?? ["en"],
        resolveDepth: normalizeDepth(seoCfg.resolveDepth),
        slugPaths,
      },
    };

    const existing = collection.admin?.components?.edit?.beforeDocumentControls ?? [];

    return {
      ...collection,
      admin: {
        ...collection.admin,
        components: {
          ...collection.admin?.components,
          edit: {
            ...collection.admin?.components?.edit,
            beforeDocumentControls: [...existing, buttonEntry],
          },
        },
      },
    };
  });

  return { ...incomingConfig, collections };
}
