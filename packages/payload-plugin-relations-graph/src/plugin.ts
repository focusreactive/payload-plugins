import type { Config, Plugin } from "payload";

import { graphEndpoint } from "./endpoints.js";
import { insightsEndpoints } from "./features/insights/index.js";
import { referencesEndpoints, withReferencesUI } from "./features/references/index.js";
import { CUSTOM_KEY, NAV_LINK_COMPONENT, VIEW_COMPONENT } from "./lib/constants.js";
import { resolveOptions } from "./lib/options.js";
import type { RelationsGraphOptions } from "./types.js";

export const relationsGraph =
  (options: RelationsGraphOptions = {}): Plugin =>
  (incoming: Config): Config => {
    if (options.enabled === false) {
      return incoming;
    }

    const resolved = resolveOptions(options);
    const components = incoming.admin?.components;

    const config: Config = {
      ...incoming,
      admin: {
        ...incoming.admin,
        components: {
          ...components,
          afterNavLinks: resolved.navLink
            ? [
                ...(components?.afterNavLinks ?? []),
                { clientProps: { viewPath: resolved.path }, path: NAV_LINK_COMPONENT },
              ]
            : components?.afterNavLinks,
          views: {
            ...components?.views,
            relationsGraph: { Component: VIEW_COMPONENT, exact: true, path: resolved.path },
          },
        },
      },
      custom: { ...incoming.custom, [CUSTOM_KEY]: resolved },
      endpoints: [
        ...(incoming.endpoints ?? []),
        graphEndpoint,
        ...(resolved.insights ? insightsEndpoints(resolved) : []),
        ...(resolved.references === false ? [] : referencesEndpoints(resolved)),
      ],
    };

    return resolved.references === false ? config : withReferencesUI(config, resolved);
  };
