export function commonJsDefault<T>(exported: T): T {
  if (exported && typeof exported === "object" && "default" in exported)
    return commonJsDefault(exported.default as T);
  return exported;
}
