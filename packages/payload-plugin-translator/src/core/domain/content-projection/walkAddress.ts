import type { IdPath as WalkPath, PathSegment as WalkToken } from "../../../traversal/index.js";
import { joinRendered, renderSegment } from "./idPath.js";
import type { IdPath, RenderedSegment } from "./idPath.js";

export const walkAddress = (path: WalkPath): IdPath =>
  joinRendered(
    path.map((token: WalkToken) =>
      typeof token === "number"
        ? renderSegment({ kind: "index", index: token })
        : (token as RenderedSegment)
    )
  );
