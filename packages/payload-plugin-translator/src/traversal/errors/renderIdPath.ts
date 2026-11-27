import type { IdPath, PathSegment } from "../contract.js";

const dumpToken = (token: PathSegment): string => {
  if (typeof token === "string") return token;
  if (typeof token !== "object" || token === null) return String(token);
  // This runs while an error is being built: a host token that is cyclic, or whose own `toJSON`
  // throws or returns `undefined`, must not replace the error worth reading.
  try {
    return JSON.stringify(token) ?? Object.prototype.toString.call(token);
  } catch {
    return Object.prototype.toString.call(token);
  }
};

export const renderIdPath = (idPath: IdPath): string => idPath.map(dumpToken).join(".") || "<root>";
