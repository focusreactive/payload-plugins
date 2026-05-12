import type { CollectionSlug, Field } from 'payload'
import type { TranslationStrategyName } from '../../modules/translation-pipeline/strategies'

/**
 * Input for the translate document handler
 */
export type TranslateDocumentInput = {
  collection: CollectionSlug
  collectionId: string | number
  sourceLng: string
  targetLng: string
  strategy: TranslationStrategyName
  publishOnTranslation: boolean
}

/**
 * Output of the translate document handler
 */
export type TranslateDocumentOutput = {
  success: true
}

/**
 * Map of collection slug to original field schema.
 * Used to access original schemas before Payload sanitization.
 */
export type CollectionSchemaMap = Map<CollectionSlug, Field[]>

/**
 * Payload task configuration
 */
export type TaskConfig = {
  collections: CollectionSlug[]
  retries?: {
    attempts?: number
    backoff?: { delay?: number; type: 'exponential' | 'fixed' }
  }
}

/**
 * Auto-run configuration for the job queue
 */
export type AutoRunConfig = {
  cron?: string
  limit?: number
  queue?: string
}

/**
 * Payload input schema for the task
 */
export const taskInputSchema: Field[] = [
  {
    type: 'relationship',
    name: 'collection',
    relationTo: [], // Will be populated with actual collections
    required: true,
  },
  {
    type: 'text',
    maxLength: 256,
    name: 'source_lng',
    required: true,
  },
  {
    type: 'text',
    maxLength: 256,
    name: 'target_lng',
    required: true,
  },
]

export const TASK_NAME = 'translate_document' as const
export const QUEUE_NAME = 'translations' as const
export const DEFAULT_AUTO_RUN: AutoRunConfig = {
  cron: '* * * * *',
  limit: 50,
}
