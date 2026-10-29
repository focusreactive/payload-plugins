import type { Translate } from "../compat.js";
import type { DropRefusal } from "./dropTargets.js";

/** The reason a gap refuses the dragged rows, as the tooltip words it. */
export const dropRefusalText = (refusal: DropRefusal, translate: Translate): string => {
  switch (refusal.kind) {
    case "conflict": {
      return translate("dropConflict", {
        other: refusal.otherTitle ?? translate("dropConflictFolder"),
        path: refusal.path,
        title: refusal.title,
      });
    }
    case "cycle": {
      return translate("moveToCycle");
    }
    case "depth": {
      return translate("dropDepth", { depth: refusal.depth, limit: refusal.limit });
    }
    case "reserved": {
      return translate(refusal.dot ? "dropReservedDot" : "dropReserved", {
        segment: refusal.segment,
      });
    }
    default: {
      return translate("moveToType", { path: refusal.path, types: refusal.types.join(", ") });
    }
  }
};
