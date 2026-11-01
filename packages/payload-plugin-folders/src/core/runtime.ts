import type { Payload } from "payload";

import type { ResolvedOptions } from "../types.js";

// The plugin resolves its options while the config is built, long before a Payload instance
// exists. Server functions that take only `payload` (moveItems, planMove, resolvePath) read them
// back here. The map lives on `globalThis`, because a Next.js app bundles the plugin once per
// route layer: the copy that registered the options in `onInit` is not the copy a page imports,
// and a module-level map would be empty for the page.
const registryKey = Symbol.for("@focus-reactive/payload-plugin-folders/resolved-options");
const globalRegistry = globalThis as { [registryKey]?: WeakMap<Payload, ResolvedOptions> };
const optionsByPayload = (globalRegistry[registryKey] ??= new WeakMap<Payload, ResolvedOptions>());

export const registerResolvedOptions = (payload: Payload, options: ResolvedOptions): void => {
  optionsByPayload.set(payload, options);
};

/** The options the folders plugin was configured with on this Payload instance. */
export const getResolvedOptions = (payload: Payload): ResolvedOptions => {
  const options = optionsByPayload.get(payload);
  if (!options) {
    throw new Error(
      "The folders plugin is not active on this Payload instance: register foldersPlugin() in the config and leave `disabled` off"
    );
  }

  return options;
};
