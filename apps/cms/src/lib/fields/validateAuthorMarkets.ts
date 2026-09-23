import type { RelationshipFieldSingleValidation } from "payload";

import { MARKET_OPTIONS } from "./marketsField";

type MarketValue = (typeof MARKET_OPTIONS)[number]["value"];

const marketLabel = (value: string): string =>
  MARKET_OPTIONS.find((option) => option.value === value)?.label ?? value;

const describeMarkets = (markets: MarketValue[]): string =>
  markets.length > 0 ? markets.map(marketLabel).join(", ") : "none set";

/**
 * The author field is a single (non-polymorphic) relationship, so at runtime
 * `value` is always a plain id - but the field's type still has to accept the
 * general relationship value shape, which includes the polymorphic
 * `{ relationTo, value }` form. Payload's own relationship validator does the
 * same branch (see the `relationship` export in payload/dist/fields/validations.js).
 */
const extractPersonId = (
  value: Parameters<RelationshipFieldSingleValidation>[0]
): number | string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    return value.value;
  }

  return value;
};

/**
 * Enforces the platform's market model at the one place it can be bypassed:
 * an author picked by hand who does not actually cover any of the insight's
 * markets. Runs on create and update, through the admin UI and the local API
 * alike, because Payload calls field `validate` for every write regardless of
 * where it originated (see slugField.ts for the same pattern).
 *
 * Either side having no markets yet is an ordinary in-progress state, not a
 * violation, so both are treated as "no constraint to check" rather than
 * rejected.
 */
export const validateAuthorMarkets: RelationshipFieldSingleValidation = async (
  value,
  { req, siblingData }
) => {
  const personId = extractPersonId(value);
  if (personId === null || !req?.payload) {
    return true;
  }

  const insightMarkets =
    (siblingData as { markets?: MarketValue[] | null } | undefined)?.markets ?? [];
  if (insightMarkets.length === 0) {
    return true;
  }

  const author = await req.payload.findByID({
    id: personId,
    collection: "person",
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
  });

  const authorMarkets = author?.markets ?? [];
  if (authorMarkets.length === 0) {
    return true;
  }

  const sharesAMarket = insightMarkets.some((market) => authorMarkets.includes(market));
  if (sharesAMarket) {
    return true;
  }

  return `This author does not cover any of this insight's markets. Insight markets: ${describeMarkets(
    insightMarkets
  )}. ${author?.name ?? "This author"}'s markets: ${describeMarkets(authorMarkets)}.`;
};
