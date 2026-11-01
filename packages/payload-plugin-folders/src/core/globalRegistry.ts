const registryPrefix = "@focus-reactive/payload-plugin-folders/";

/**
 * One value per name for the whole process, kept on `globalThis`. A Next.js app bundles the plugin
 * once per route layer, so the copy that boots Payload (config, hooks) is not the copy a page
 * imports; state kept in a module-level variable would be two separate states, and a lock taken by
 * one copy would be invisible to the other.
 */
export const getGlobalRegistry = <TValue>(name: string, create: () => TValue): TValue => {
  const key = Symbol.for(`${registryPrefix}${name}`);
  const registry = globalThis as Record<symbol, unknown>;
  registry[key] ??= create();

  return registry[key] as TValue;
};
