import type { GlobalConfig } from "payload";
import { injectFieldCommentComponents } from "./injectFieldCommentComponents";

export function overrideGlobals(globals?: GlobalConfig[]) {
  return (globals ?? []).map(injectFieldCommentComponents);
}
