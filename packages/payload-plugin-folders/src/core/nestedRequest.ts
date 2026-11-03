import { getDataLoader } from "payload";
import type { PayloadRequest } from "payload";

/**
 * A request for code the plugin does not own (a host's access function, a host's `access.move`):
 * a shallow copy, so a nested Local API call that sets `locale` or merges into `context` changes
 * the copy and never the caller's request. It keeps the transaction, so reads join the move that
 * is running, and gets a fresh data loader, whose cache would otherwise hold values from before
 * the writes of this request.
 *
 * On a REST request `url`, `method` and the like are not own properties, so a spread drops them;
 * they are copied by name.
 */
export const createNestedRequest = (req: PayloadRequest): PayloadRequest => {
  const copy = {
    ...req,
    context: { ...req.context },
    headers: req.headers,
    host: req.host,
    method: req.method,
    origin: req.origin,
    pathname: req.pathname,
    protocol: req.protocol,
    searchParams: req.searchParams,
    url: req.url,
  } as PayloadRequest;
  copy.payloadDataLoader = getDataLoader(copy);

  return copy;
};
