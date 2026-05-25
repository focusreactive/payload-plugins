import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Payload, PayloadRequest } from 'payload'
import { RunTranslationHandler } from './handler'
import type { TaskRunnerProvider, TaskRunner } from '../../modules/task-runner'

describe('RunTranslationHandler', () => {
  let handler: RunTranslationHandler
  let mockTaskRunner: TaskRunner
  let mockTaskRunnerFactory: TaskRunnerProvider

  const createMockRequest = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: {} as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      cancel: vi.fn(),
      run: vi.fn().mockResolvedValue({ success: true }),
      findByCollection: vi.fn(),
    }

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      configure: vi.fn(),
    }

    handler = new RunTranslationHandler(mockTaskRunnerFactory)
  })

  describe('validation', () => {
    it('returns validation error for missing id', async () => {
      const req = createMockRequest({})

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Validation error')
    })

    it('returns validation error for empty id', async () => {
      const req = createMockRequest({ id: '' })

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
    })
  })

  describe('success responses', () => {
    it('returns 204 on successful run', async () => {
      ;(mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true })

      const req = createMockRequest({ id: 'task-123' })
      const response = await handler.handle(req)

      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
    })

    it('calls runner.run with correct task id', async () => {
      const req = createMockRequest({ id: 'task-456' })

      await handler.handle(req)

      expect(mockTaskRunner.run).toHaveBeenCalledWith('task-456')
    })

    it('creates task runner with request payload', async () => {
      const mockPayload = { collections: {} } as Payload
      const req = createMockRequest({ id: 'task-123' })
      ;(req as any).payload = mockPayload

      await handler.handle(req)

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload)
    })
  })

  describe('error responses', () => {
    it('returns 404 when task not found', async () => {
      ;(mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'not_found',
      })

      const req = createMockRequest({ id: 'non-existent' })
      const response = await handler.handle(req)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.message).toBe('Queued task not found')
    })

    it('returns 404 when task already completed', async () => {
      ;(mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'already_completed',
      })

      const req = createMockRequest({ id: 'completed-task' })
      const response = await handler.handle(req)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.message).toBe('Queued task not found')
    })

    it('returns 429 when task is already running', async () => {
      ;(mockTaskRunner.run as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'already_running',
      })

      const req = createMockRequest({ id: 'running-task' })
      const response = await handler.handle(req)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.message).toBe('Translation task is already in progress')
    })
  })
})
