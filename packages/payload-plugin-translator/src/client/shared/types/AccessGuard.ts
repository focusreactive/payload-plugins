import type { BasePayload, TypedUser } from 'payload'

export type AccessGuardRequest = {
  headers: Headers
  user?: TypedUser | null
  payload: BasePayload
}

export interface AccessGuard {
  check<R extends AccessGuardRequest>({ req }: { req: R }): Promise<boolean> | boolean
}
