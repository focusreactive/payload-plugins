import type { IdPath as WalkPath } from "../../../traversal/index.js";
import { TranslatorBug } from "../../errors/index.js";
import { isObject } from "../../kernel/utils/isObject.js";
import { isPathSegment, makeIdPath } from "./idPath.js";
import type { IdPath, PathSegment } from "./idPath.js";

const describe = (token: unknown): string =>
  isObject(token) && typeof token.kind === "string"
    ? `a part of kind "${token.kind}"`
    : typeof token;

const partOf = (token: unknown): PathSegment => {
  if (isPathSegment(token)) return token;
  throw new TranslatorBug(
    `a walk handed over an address part this plugin cannot read: ${describe(token)}`
  );
};

export const walkAddress = (path: WalkPath): IdPath => makeIdPath(path.map(partOf));
