import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Payload, PayloadRequest, CollectionSlug } from 'payload'
import { GetCollectionStatusHandler } from './handler'
import type { GetCollectionStatusConfig } from './model'
import type { TaskRunnerProvider, TaskRunner, Task } from '../../modules/task-runner'

describe('GetCollectionStatusHandler', () => {
  let handler: GetCollectionStatusHandler
  let mockTaskRunner: TaskRunner
  let mockTaskRunnerFactory: TaskRunnerProvider
  let config: GetCollectionStatusConfig

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-123',
    status: 'completed',
    input: {
      collectionSlug: 'posts' as CollectionSlug,
      collectionId: 'doc-123',
      sourceLng: 'en',
      targetLng: 'de',
      strategy: 'overwrite',
      publishOnTranslation: false,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T01:00:00Z',
    completedAt: '2024-01-01T01:00:00Z',
    cancelled: false,
    ...overrides,
  })

  const createMockRequest = (params: Record<string, string> = {}): PayloadRequest =>
    ({
      payload: {} as Payload,
      routeParams: params,
    }) as unknown as PayloadRequest

  beforeEach(() => {
    mockTaskRunner = {
      enqueue: vi.fn(),
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn().mockResolvedValue([]),
    }

    mockTaskRunnerFactory = {
      create: vi.fn().mockReturnValue(mockTaskRunner),
      configure: vi.fn(),
    }

    config = {
      availableCollections: new Set(['posts', 'pages'] as CollectionSlug[]),
    }

    handler = new GetCollectionStatusHandler(config, mockTaskRunnerFactory)
  })

  describe('validation', () => {
    it('returns validation error for missing collection_slug', async () => {
      const req = createMockRequest({})

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Validation error')
    })

    it('returns validation error for empty collection_slug', async () => {
      const req = createMockRequest({ collection_slug: '' })

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
    })
  })

  describe('collection availability', () => {
    it('returns bad request for unavailable collection', async () => {
      const req = createMockRequest({ collection_slug: 'users' })

      const response = await handler.handle(req)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.message).toBe('Collection not available for translation')
    })
  })

  describe('success responses', () => {
    it('returns empty docs array when no tasks exist', async () => {
      ;(mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const req = createMockRequest({ collection_slug: 'posts' })
      const response = await handler.handle(req)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data).toEqual({ docs: [] })
    })

    it('returns task statuses for all documents in collection', async () => {
      const tasks = [
        createMockTask({ id: 'task-1', status: 'completed' }),
        createMockTask({ id: 'task-2', status: 'pending' }),
        createMockTask({ id: 'task-3', status: 'running' }),
      ]
      ;(mockTaskRunner.findByCollection as ReturnType<typeof vi.fn>).mockResolvedValue(tasks)

      const req = createMockRequest({ collection_slug: 'posts' })
      const response = await handler.handle(req)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.data.docs).toEqual([
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'pending' },
        { id: 'task-3', status: 'running' },
      ])
    })

    it('calls findByCollection with correct collection slug', async () => {
      const req = createMockRequest({ collection_slug: 'pages' })

      await handler.handle(req)

      expect(mockTaskRunner.findByCollection).toHaveBeenCalledWith('pages')
    })

    it('creates task runner with request payload', async () => {
      const mockPayload = { collections: {} } as Payload
      const req = createMockRequest({ collection_slug: 'posts' })
      ;(req as any).payload = mockPayload

      await handler.handle(req)

      expect(mockTaskRunnerFactory.create).toHaveBeenCalledWith(mockPayload)
    })
  })
})
