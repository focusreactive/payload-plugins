import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'
import { DataReconciler } from './DataReconciler'

describe('DataReconciler', () => {
  describe('deep merge with target priority', () => {
    it('uses target value when it exists', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const sourceData = { title: 'Hello' }
      const targetData = { title: 'Existing' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: 'Existing' })
    })

    it('uses source value when target is empty', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const sourceData = { title: 'Hello' }
      const targetData = { title: '' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: 'Hello' })
    })

    it('uses source value when target is missing', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const sourceData = { title: 'Hello' }
      const targetData = {}

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: 'Hello' })
    })

    it('handles multiple fields independently', () => {
      const schema: Field[] = [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'text', localized: true },
        { name: 'slug', type: 'text', localized: false },
      ]
      const sourceData = { title: 'Hello', description: 'World', slug: 'hello' }
      const targetData = { title: 'Translated Title', description: '', slug: 'other-slug' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: 'Translated Title',
        description: 'World',
        slug: 'other-slug',
      })
    })

    it('preserves full document shape', () => {
      const schema: Field[] = [
        { name: 'title', type: 'text', localized: true },
        { name: 'slug', type: 'text', localized: false },
        { name: 'author', type: 'relationship', relationTo: 'users', localized: false },
      ]
      const sourceData = { title: 'Hello', slug: 'hello', author: '123' }
      const targetData = {}

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: 'Hello',
        slug: 'hello',
        author: '123',
      })
    })
  })

  describe('nested structures', () => {
    it('reconciles group fields', () => {
      const schema: Field[] = [
        {
          name: 'meta',
          type: 'group',
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'slug', type: 'text', localized: false },
          ],
        },
      ]
      const sourceData = { meta: { title: 'Hello', slug: 'hello' } }
      const targetData = { meta: { title: 'Existing', slug: '' } }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        meta: { title: 'Existing', slug: 'hello' },
      })
    })

    it('reconciles array fields', () => {
      const schema: Field[] = [
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', localized: true },
            { name: 'value', type: 'text', localized: false },
          ],
        },
      ]
      const sourceData = {
        items: [
          { id: '1', label: 'First', value: 'one' },
          { id: '2', label: 'Second', value: 'two' },
        ],
      }
      const targetData = {
        items: [
          { id: '1', label: 'Translated', value: '' },
          { id: '2', label: '', value: 'y' },
        ],
      }

      const reconciler = new DataReconciler(schema)
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [
          { label: 'Translated', value: 'one' },
          { label: 'Second', value: 'y' },
        ],
      })
    })

    it('reconciles blocks fields', () => {
      const schema: Field[] = [
        {
          name: 'layout',
          type: 'blocks',
          blocks: [
            {
              slug: 'text',
              fields: [
                { name: 'content', type: 'text', localized: true },
                { name: 'style', type: 'text', localized: false },
              ],
            },
          ],
        },
      ]
      const sourceData = {
        layout: [{ id: '1', blockType: 'text', content: 'Hello', style: 'bold' }],
      }
      const targetData = {
        layout: [{ id: '1', blockType: 'text', content: 'Existing', style: '' }],
      }

      const reconciler = new DataReconciler(schema)
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: 'text', content: 'Existing', style: 'bold' }],
      })
    })

    it('uses source for empty target in blocks', () => {
      const schema: Field[] = [
        {
          name: 'layout',
          type: 'blocks',
          blocks: [
            {
              slug: 'text',
              fields: [{ name: 'content', type: 'text', localized: true }],
            },
          ],
        },
      ]
      const sourceData = {
        layout: [{ id: '1', blockType: 'text', content: 'Hello' }],
      }
      const targetData = {
        layout: [{ id: '1', blockType: 'text', content: '' }],
      }

      const reconciler = new DataReconciler(schema)
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: 'text', content: 'Hello' }],
      })
    })
  })

  describe('edge cases', () => {
    it('handles null targetData', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const sourceData = { title: 'Hello' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, null as unknown as Record<string, unknown>)).toEqual({
        title: 'Hello',
      })
    })

    it('skips undefined source values', () => {
      const schema: Field[] = [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'text', localized: true },
      ]
      const sourceData = { title: 'Hello' }
      const targetData = { title: 'Existing', description: 'Target desc' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: 'Existing',
      })
    })
  })

  describe('tabs support', () => {
    it('reconciles fields in named tabs', () => {
      const schema: Field[] = [
        {
          type: 'tabs',
          tabs: [
            {
              name: 'seo',
              fields: [
                { name: 'title', type: 'text', localized: true },
                { name: 'description', type: 'text', localized: true },
              ],
            },
          ],
        },
      ]
      const sourceData = { seo: { title: 'Hello', description: 'World' } }
      const targetData = { seo: { title: 'Translated', description: '' } }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seo: { title: 'Translated', description: 'World' },
      })
    })

    it('reconciles fields in unnamed tabs', () => {
      const schema: Field[] = [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'Content',
              fields: [
                { name: 'title', type: 'text', localized: true },
                { name: 'body', type: 'text', localized: true },
              ],
            },
          ],
        },
      ]
      const sourceData = { title: 'Hello', body: 'World' }
      const targetData = { title: 'Translated', body: '' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: 'Translated',
        body: 'World',
      })
    })

    it('reconciles multiple tabs with mixed named/unnamed', () => {
      const schema: Field[] = [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'Content',
              fields: [{ name: 'title', type: 'text', localized: true }],
            },
            {
              name: 'seo',
              fields: [{ name: 'metaTitle', type: 'text', localized: true }],
            },
          ],
        },
      ]
      const sourceData = { title: 'Hello', seo: { metaTitle: 'SEO Title' } }
      const targetData = { title: 'Translated', seo: { metaTitle: '' } }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: 'Translated',
        seo: { metaTitle: 'SEO Title' },
      })
    })
  })

  describe('row and collapsible fields', () => {
    it('reconciles fields in row', () => {
      const schema: Field[] = [
        {
          type: 'row',
          fields: [
            { name: 'firstName', type: 'text', localized: true },
            { name: 'lastName', type: 'text', localized: true },
          ],
        },
      ]
      const sourceData = { firstName: 'John', lastName: 'Doe' }
      const targetData = { firstName: 'Johann', lastName: '' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        firstName: 'Johann',
        lastName: 'Doe',
      })
    })

    it('reconciles fields in collapsible', () => {
      const schema: Field[] = [
        {
          type: 'collapsible',
          label: 'Advanced',
          fields: [
            { name: 'seoTitle', type: 'text', localized: true },
            { name: 'seoDescription', type: 'text', localized: true },
          ],
        },
      ]
      const sourceData = { seoTitle: 'Title', seoDescription: 'Description' }
      const targetData = { seoTitle: 'Translated', seoDescription: '' }

      const reconciler = new DataReconciler(schema)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seoTitle: 'Translated',
        seoDescription: 'Description',
      })
    })
  })
})
