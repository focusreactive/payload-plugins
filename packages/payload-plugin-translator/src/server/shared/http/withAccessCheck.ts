import type { PayloadRequest } from 'payload'

import type { AccessGuard } from '../access/types'
import { ServerResponse } from './ServerResponse'

/**
 * Wraps handler with access check.
 * Returns 403 Forbidden if access guard denies the request.
 */
export function withAccessCheck(
  handler: (req: PayloadRequest) => Promise<Response>,
  access?: AccessGuard,
): (req: PayloadRequest) => Promise<Response> {
  if (!access) return handler

  return async (req) => {
    const hasAccess = await access.check({ req })
    if (!hasAccess) return ServerResponse.forbidden()
    return handler(req)
  }
}
