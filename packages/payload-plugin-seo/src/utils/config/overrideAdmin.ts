import type { Config } from "payload";
import { getComponentPath } from "./getComponentPath";
import { resolveApiKey } from "../../server/generate/apiKey";
import { createGenerateEndpoint } from "../../server/generate/endpoint";
import type { SeoClientConfig } from "../../client-config/registry";
import type { SeoPluginConfig, SeoSiteConfig } from "../../types/config";

export function overrideAdmin(incomingConfig: Config, config: SeoPluginConfig): Config {
  const bySlug = new Map(config.collections.map((c) => [c.slug, c]));
  const site: SeoSiteConfig = config.site ?? {};

  const collections = (incomingConfig.collections ?? []).map((collection) => {
    const seoCfg = bySlug.get(collection.slug);
    if (!seoCfg) return collection;

    const buttonEntry = {
      path: getComponentPath("components/SeoButton"),
      clientProps: {
        collectionSlug: collection.slug,
        fields: seoCfg.fields ?? {},
        extractContentPath: seoCfg.extractContentPath,
        site: {
          name: site.name ?? "",
          baseUrl: site.baseUrl ?? "",
          faviconUrl: site.faviconUrl ?? "",
        },
        supportedLocales: config.supportedLocales ?? ["en"],
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

  const clientConfig: SeoClientConfig = {
    enabled: Boolean(resolveApiKey(config.generation)),
    extractByCollection: Object.fromEntries(
      config.collections.map((c) => [c.slug, c.extractContentPath])
    ),
  };

  const providerEntry = {
    path: getComponentPath("providers/SeoClientConfigProvider", "SeoClientConfigProvider"),
    clientProps: {
      config: clientConfig,
    },
  };

  const providers = [...(incomingConfig.admin?.components?.providers ?? []), providerEntry];

  return {
    ...incomingConfig,
    collections,
    endpoints: [...(incomingConfig.endpoints ?? []), createGenerateEndpoint()],
    admin: {
      ...incomingConfig.admin,
      components: {
        ...incomingConfig.admin?.components,
        providers,
      },
    },
  };
}
