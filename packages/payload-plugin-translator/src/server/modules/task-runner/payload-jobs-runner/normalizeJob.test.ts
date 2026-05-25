import { describe, it, expect } from 'vitest'
import type { CollectionSlug } from 'payload'
import { normalizeJob } from './normalizeJob'
import type { PayloadJob } from './types'

describe('normalizeJob', () => {
  const baseJob: PayloadJob = {
    id: 'job-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    input: {
      collection: {
        relationTo: 'posts' as CollectionSlug,
        value: 'doc-456',
      },
      source_lng: 'en',
      target_lng: 'de',
      strategy: 'overwrite',
    },
  }

  describe('basic transformation', () => {
    it('transforms job to task with correct id', () => {
      const task = normalizeJob(baseJob)
      expect(task.id).toBe('job-123')
    })

    it('transforms job to task with correct input', () => {
      const task = normalizeJob(baseJob)
      expect(task.input).toEqual({
        collectionSlug: 'posts',
        collectionId: 'doc-456',
        sourceLng: 'en',
        targetLng: 'de',
        strategy: 'overwrite',
        publishOnTranslation: false,
      })
    })

    it('transforms job to task with correct timestamps', () => {
      const task = normalizeJob(baseJob)
      expect(task.createdAt).toBe('2024-01-01T00:00:00Z')
      expect(task.updatedAt).toBe('2024-01-01T00:00:00Z')
    })
  })

  describe('status detection', () => {
    it('returns pending status for new job', () => {
      const task = normalizeJob(baseJob)
      expect(task.status).toBe('pending')
    })

    it('returns running status when processing is true', () => {
      const job: PayloadJob = { ...baseJob, processing: true }
      const task = normalizeJob(job)
      expect(task.status).toBe('running')
    })

    it('returns completed status when completedAt is set', () => {
      const job: PayloadJob = { ...baseJob, completedAt: '2024-01-01T01:00:00Z' }
      const task = normalizeJob(job)
      expect(task.status).toBe('completed')
      expect(task.completedAt).toBe('2024-01-01T01:00:00Z')
    })

    it('returns failed status when error is set', () => {
      const job: PayloadJob = { ...baseJob, error: { message: 'Something went wrong' } }
      const task = normalizeJob(job)
      expect(task.status).toBe('failed')
    })

    it('completed takes precedence over processing', () => {
      const job: PayloadJob = { ...baseJob, completedAt: '2024-01-01T01:00:00Z', processing: true }
      const task = normalizeJob(job)
      expect(task.status).toBe('completed')
    })

    it('completed takes precedence over error', () => {
      const job: PayloadJob = {
        ...baseJob,
        completedAt: '2024-01-01T01:00:00Z',
        error: { message: 'err' },
      }
      const task = normalizeJob(job)
      expect(task.status).toBe('completed')
    })
  })

  describe('error handling', () => {
    it('extracts error message from error object', () => {
      const job: PayloadJob = { ...baseJob, error: { message: 'Translation failed' } }
      const task = normalizeJob(job)
      expect(task.error).toEqual({ message: 'Translation failed' })
    })

    it('returns unknown error for non-standard error', () => {
      const job: PayloadJob = { ...baseJob, error: 'some string error' }
      const task = normalizeJob(job)
      expect(task.error).toEqual({ message: 'Unknown error' })
    })

    it('returns unknown error for error without message', () => {
      const job: PayloadJob = { ...baseJob, error: { code: 500 } }
      const task = normalizeJob(job)
      expect(task.error).toEqual({ message: 'Unknown error' })
    })

    it('sets error to undefined when no error', () => {
      const task = normalizeJob(baseJob)
      expect(task.error).toBeUndefined()
    })
  })

  describe('cancelled detection', () => {
    it('detects cancelled job', () => {
      const job: PayloadJob = { ...baseJob, error: { cancelled: true, message: 'Cancelled' } }
      const task = normalizeJob(job)
      expect(task.cancelled).toBe(true)
    })

    it('returns false for non-cancelled error', () => {
      const job: PayloadJob = { ...baseJob, error: { message: 'Failed' } }
      const task = normalizeJob(job)
      expect(task.cancelled).toBe(false)
    })

    it('returns false for cancelled: false', () => {
      const job: PayloadJob = { ...baseJob, error: { cancelled: false, message: 'Error' } }
      const task = normalizeJob(job)
      expect(task.cancelled).toBe(false)
    })

    it('returns false for no error', () => {
      const task = normalizeJob(baseJob)
      expect(task.cancelled).toBe(false)
    })
  })

  describe('missing input fields', () => {
    it('handles missing input gracefully', () => {
      const job: PayloadJob = { ...baseJob, input: undefined }
      const task = normalizeJob(job)
      expect(task.input).toEqual({
        collectionSlug: '',
        collectionId: '',
        sourceLng: '',
        targetLng: '',
        strategy: 'overwrite',
        publishOnTranslation: false,
      })
    })

    it('handles missing collection in input', () => {
      const job: PayloadJob = {
        ...baseJob,
        input: { source_lng: 'en', target_lng: 'de' },
      }
      const task = normalizeJob(job)
      expect(task.input.collectionSlug).toBe('')
      expect(task.input.collectionId).toBe('')
    })

    it('handles missing strategy with default', () => {
      const job: PayloadJob = {
        ...baseJob,
        input: { ...baseJob.input, strategy: undefined },
      }
      const task = normalizeJob(job)
      expect(task.input.strategy).toBe('overwrite')
    })

    it('handles skip_existing strategy', () => {
      const job: PayloadJob = {
        ...baseJob,
        input: { ...baseJob.input, strategy: 'skip_existing' },
      }
      const task = normalizeJob(job)
      expect(task.input.strategy).toBe('skip_existing')
    })
  })

  describe('completedAt handling', () => {
    it('sets completedAt to undefined when null', () => {
      const job: PayloadJob = { ...baseJob, completedAt: null }
      const task = normalizeJob(job)
      expect(task.completedAt).toBeUndefined()
    })

    it('sets completedAt to value when provided', () => {
      const job: PayloadJob = { ...baseJob, completedAt: '2024-01-02T00:00:00Z' }
      const task = normalizeJob(job)
      expect(task.completedAt).toBe('2024-01-02T00:00:00Z')
    })
  })
})
