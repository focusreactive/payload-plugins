import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Payload, PayloadRequest } from 'payload'
import { CancelHandler } from './handler'
import type { TaskRunner, TaskRunnerProvider } from '../../modules/task-runner'

describe('CancelHandler', () => {
  let handler: CancelHandler
  let mockTaskRunner: TaskRunner
  let mockTaskRunnerFactory: TaskRunnerProvider

  const createMockRequest = (body: unknown): PayloadRequest =>
    ({
      payload: {} as Payload,
      json: vi.fn().mockResolvedValue(body),
    }) as unknown as PayloadRequest

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      cancel: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
      findByCollection: vi.fn(),
    }

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      configure: vi.fn(),
    }

    handler = new CancelHandler(mockTaskRunnerFactory)
  })

  describe('validation', () => {
    it('returns validation error for missing ids', async () => {
      const req = createMockRequest({})

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Validation error')
    })

    it('returns validation error for non-array ids', async () => {
      const req = createMockRequest({ ids: 'not-an-array' })

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
    })

    it('returns validation error for empty ids array', async () => {
      const req = createMockRequest({ ids: [] })

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
    })
  })

  describe('success responses', () => {
    it('cancels tasks and returns 204', async () => {
      const req = createMockRequest({ ids: ['task-1', 'task-2'] })

      const response = await handler.handle(req)

      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
    })

    it('calls runner.cancel with provided ids', async () => {
      const req = createMockRequest({ ids: ['task-1', 'task-2', 'task-3'] })

      await handler.handle(req)

      expect(mockTaskRunner.cancel).toHaveBeenCalledWith(['task-1', 'task-2', 'task-3'])
    })

    it('creates task runner with request payload', async () => {
      const mockPayload = { collections: {} } as Payload
      const req = createMockRequest({ ids: ['task-1'] })
      ;(req as any).payload = mockPayload

      await handler.handle(req)

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload)
    })
  })
})
