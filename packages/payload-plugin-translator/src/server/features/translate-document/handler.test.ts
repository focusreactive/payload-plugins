import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Payload, CollectionSlug } from 'payload'
import { APIError } from 'payload'
import { TranslateDocumentHandler } from './handler'
import type { TranslationProvider } from '../../modules/translation-providers'
import type { CollectionSchemaMap, TranslateDocumentInput } from './model'

// Mock TranslationPipeline
vi.mock('../../modules/translation-pipeline', () => ({
  TranslationPipeline: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue(null),
  })),
}))

// Mock createTranslationStrategy
vi.mock('../../modules/translation-pipeline/strategies', () => ({
  createTranslationStrategy: vi.fn().mockReturnValue({}),
}))

describe('TranslateDocumentHandler', () => {
  let handler: TranslateDocumentHandler
  let mockTranslationProvider: TranslationProvider
  let mockSchemaMap: CollectionSchemaMap
  let mockPayload: Payload

  const createInput = (overrides: Partial<TranslateDocumentInput> = {}): TranslateDocumentInput => ({
    collection: 'posts' as CollectionSlug,
    collectionId: 'doc-123',
    sourceLng: 'en',
    targetLng: 'de',
    strategy: 'overwrite',
    publishOnTranslation: false,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockTranslationProvider = {
      translate: vi.fn().mockResolvedValue({}),
    }

    mockSchemaMap = new Map([
      ['posts' as CollectionSlug, [{ name: 'title', type: 'text', localized: true }]],
      ['pages' as CollectionSlug, [{ name: 'content', type: 'richText', localized: true }]],
    ]) as CollectionSchemaMap

    mockPayload = {
      findByID: vi.fn().mockResolvedValue({ id: 'doc-123', title: 'Test' }),
      update: vi.fn().mockResolvedValue({}),
      collections: {
        posts: {
          config: {
            versions: undefined,
          },
        },
        pages: {
          config: {
            versions: {
              drafts: true,
            },
          },
        },
      },
    } as unknown as Payload

    handler = new TranslateDocumentHandler(mockTranslationProvider, mockSchemaMap)
  })

  describe('schema validation', () => {
    it('throws APIError when collection not in schemaMap', async () => {
      const input = createInput({ collection: 'unknown' as CollectionSlug })

      await expect(handler.handle(mockPayload, input)).rejects.toThrow(APIError)
      await expect(handler.handle(mockPayload, input)).rejects.toThrow('Collection "unknown" not found in schemaMap')
    })
  })

  describe('document fetching', () => {
    it('fetches source document with source locale', async () => {
      const input = createInput({ sourceLng: 'en' })

      await handler.handle(mockPayload, input)

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'posts',
        id: 'doc-123',
        locale: 'en',
        depth: 0,
      })
    })

    it('fetches target document with target locale and no fallback', async () => {
      const input = createInput({ targetLng: 'de' })

      await handler.handle(mockPayload, input)

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'posts',
        id: 'doc-123',
        locale: 'de',
        fallbackLocale: false,
        depth: 0,
      })
    })
  })

  describe('success responses', () => {
    it('returns success when no translation needed (pipeline returns null)', async () => {
      const input = createInput()

      const result = await handler.handle(mockPayload, input)

      expect(result).toEqual({ success: true })
      expect(mockPayload.update).not.toHaveBeenCalled()
    })

    it('returns success after saving translated document', async () => {
      const { TranslationPipeline } = await import('../../modules/translation-pipeline')
      ;(TranslationPipeline as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({ translatedData: { title: 'Übersetzter Titel' } }),
      }))

      const input = createInput()
      const result = await handler.handle(mockPayload, input)

      expect(result).toEqual({ success: true })
    })
  })

  describe('saving translated documents', () => {
    beforeEach(async () => {
      const { TranslationPipeline } = await import('../../modules/translation-pipeline')
      ;(TranslationPipeline as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        execute: vi.fn().mockResolvedValue({ translatedData: { title: 'Translated' } }),
      }))
    })

    it('saves document with target locale and source as fallback', async () => {
      const input = createInput({ sourceLng: 'en', targetLng: 'fr' })

      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'posts',
          id: 'doc-123',
          locale: 'fr',
          fallbackLocale: 'en',
        }),
      )
    })

    it('saves document without autosave when versions not enabled', async () => {
      const input = createInput()

      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        }),
      )
    })

    it('sets _status to draft when versions with drafts enabled', async () => {
      ;(mockPayload.collections['posts'].config as { versions: unknown }).versions = { drafts: true }

      const input = createInput()
      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            _status: 'draft',
          }),
        }),
      )
    })

    it('sets _status to published when publishOnTranslation is true', async () => {
      ;(mockPayload.collections['posts'].config as { versions: unknown }).versions = { drafts: true }

      const input = createInput({ publishOnTranslation: true })
      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            _status: 'published',
          }),
        }),
      )
    })

    it('uses autosave when drafts with autosave enabled and not publishing', async () => {
      ;(mockPayload.collections['posts'].config as { versions: unknown }).versions = {
        drafts: { autosave: true },
      }

      const input = createInput()
      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: true,
        }),
      )
    })

    it('does not use autosave when publishing', async () => {
      ;(mockPayload.collections['posts'].config as { versions: unknown }).versions = {
        drafts: { autosave: true },
      }

      const input = createInput({ publishOnTranslation: true })
      await handler.handle(mockPayload, input)

      expect(mockPayload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          autosave: false,
        }),
      )
    })
  })
})
