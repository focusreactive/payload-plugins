import { joinRendered } from "../../core/domain/content-projection/idPath.js";
import type { RenderedSegment } from "../../core/domain/content-projection/idPath.js";
import type { TranslationTarget } from "../../core/traversal/index.js";

/**
 * Re-admits `RenderedSegment` on a token that lost the brand crossing the kernel's loosely-typed
 * address. A number is refused; a string is taken on trust, because nothing at runtime tells a
 * rendered token from one that skipped `renderSegment`.
 */
export const addressesOf = (targets: readonly TranslationTarget[]): string[] =>
  targets.map((target) =>
    String(
      joinRendered(
        target.idPath.map((token) => {
          if (typeof token !== "string") {
            throw new TypeError(`address segment was never rendered: ${String(token)}`);
          }
          return token as RenderedSegment;
        })
      )
    )
  );
