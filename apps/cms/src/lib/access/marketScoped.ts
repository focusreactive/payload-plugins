import type { Access, CollectionBeforeChangeHook } from "payload";
import { APIError } from "payload";

import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import type { User } from "@/payload-types";

/**
 * A local marketing editor carries the markets they look after on their user record. An editor
 * with none set is the international editor and works across every market; one with markets set
 * may only change documents filed under at least one of them. Admins are never scoped.
 */
// req.user can also be an MCP API key, which has no role and is never scoped.
function asEditor(user: unknown): User | null {
  return user && typeof user === "object" && "role" in user ? (user as User) : null;
}

function scopedMarkets(user: unknown): string[] | null {
  const editor = asEditor(user);
  if (!editor || editor.role !== "author") return null;
  return editor.markets?.length ? editor.markets : null;
}

export const editorialInOwnMarkets: Access = ({ req: { user } }) => {
  const editor = asEditor(user);
  if (!editor) return false;
  if (editor.role === "admin") return true;
  if (editor.role !== "author") return false;
  const markets = scopedMarkets(editor);
  return markets ? { markets: { in: markets } } : true;
};

/**
 * Access can filter which existing documents an editor may touch, but it cannot see the data a
 * create or an update is about to write. Without this hook a Canada editor could re-file a UK
 * article into Canada, or create one filed under Japan.
 */
export const rejectMarketsOutsideEditorScope: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const markets = scopedMarkets(req.user);
  if (!markets) return data;
  const incoming: string[] = data?.markets ?? originalDoc?.markets ?? [];
  // A market the document already carried may stay: a Canada editor fixing a typo in an article
  // filed under UK/Europe and Canada must not have to strip UK/Europe to save it.
  const alreadyFiled: string[] = originalDoc?.markets ?? [];
  const added = incoming.filter(
    (market) => !markets.includes(market) && !alreadyFiled.includes(market)
  );
  const touchesOwnMarket = incoming.some((market) => markets.includes(market));
  if (!touchesOwnMarket || added.length > 0) {
    throw new APIError(
      `You look after ${markets.map((market) => MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market).join(", ")}. File this under at least one of those markets, and only those.`,
      403,
      null,
      true
    );
  }
  return data;
};

/**
 * The content types a local editor does not own. They edit pages in place but never create or
 * delete one, so the site structure stays with the international team.
 */
export const notScopedEditor: Access = ({ req: { user } }) => {
  const editor = asEditor(user);
  if (!editor) return false;
  if (editor.role === "admin") return true;
  if (editor.role !== "author") return false;
  return scopedMarkets(editor) === null;
};
