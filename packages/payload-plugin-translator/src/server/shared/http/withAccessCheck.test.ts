import { describe, it, expect, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { withAccessCheck } from './withAccessCheck'
import { ServerResponse } from './ServerResponse'
import type { AccessGuard } from '../access/types'

describe('withAccessCheck', () => {
  const createMockRequest = (): PayloadRequest =>
    ({
      user: { id: 'user-1' },
    }) as unknown as PayloadRequest

  const createMockAccessGuard = (allowed: boolean): AccessGuard => ({
    check: vi.fn().mockResolvedValue(allowed),
  })

  it('returns original handler when no access guard provided', async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success())

    const wrappedHandler = withAccessCheck(handler)

    expect(wrappedHandler).toBe(handler)
  })

  it('calls handler when access is allowed', async () => {
    const expectedResponse = ServerResponse.success({ data: 'test' })
    const handler = vi.fn().mockResolvedValue(expectedResponse)
    const accessGuard = createMockAccessGuard(true)
    const req = createMockRequest()

    const wrappedHandler = withAccessCheck(handler, accessGuard)
    const result = await wrappedHandler(req)

    expect(accessGuard.check).toHaveBeenCalledWith({ req })
    expect(handler).toHaveBeenCalledWith(req)
    expect(result).toBe(expectedResponse)
  })

  it('returns 403 when access is denied', async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success())
    const accessGuard = createMockAccessGuard(false)
    const req = createMockRequest()

    const wrappedHandler = withAccessCheck(handler, accessGuard)
    const result = await wrappedHandler(req)

    expect(accessGuard.check).toHaveBeenCalledWith({ req })
    expect(handler).not.toHaveBeenCalled()
    expect(result.status).toBe(403)
    expect(await result.json()).toEqual({ message: 'Forbidden' })
  })

  it('passes request to access guard', async () => {
    const handler = vi.fn().mockResolvedValue(ServerResponse.success())
    const accessGuard = createMockAccessGuard(true)
    const req = createMockRequest()

    const wrappedHandler = withAccessCheck(handler, accessGuard)
    await wrappedHandler(req)

    expect(accessGuard.check).toHaveBeenCalledWith({ req })
  })
})
