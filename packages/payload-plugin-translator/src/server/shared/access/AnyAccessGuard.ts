import type { AccessGuard } from './types'

/**
 * Default access guard that allows all requests
 */
export class AnyAccessGuard implements AccessGuard {
  async check(): Promise<boolean> {
    return true
  }
}
