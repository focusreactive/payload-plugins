import type { Where } from "payload";

import type { DocumentId, LocaleCode } from "../../../types/wire/primitives.js";
import type { ApiRequest } from "./createRequest.js";

export type MatchingIdsQuery = {
  collection: string;
  where: Where;
  locale?: LocaleCode;
};

type IdsPage = { docs: readonly { id: string | number }[] };

/**
 * Every id Payload's REST `find` returns for the query, unpaginated. The request's base is Payload's
 * `routes.api`, not the plugin's. `where` travels as JSON, which Payload parses
 * (`payload/dist/utilities/parseParams`); `select` must use the bracket form, which it does not.
 */
export async function findMatchingIds(
  request: ApiRequest,
  { collection, where, locale }: MatchingIdsQuery
): Promise<DocumentId[]> {
  const page = await request<IdsPage>(`/${collection}`, {
    query: {
      where: JSON.stringify(where),
      depth: 0,
      pagination: false,
      "select[id]": true,
      ...(locale ? { locale } : {}),
    },
  });
  return page.docs.map(({ id }) => String(id));
}
