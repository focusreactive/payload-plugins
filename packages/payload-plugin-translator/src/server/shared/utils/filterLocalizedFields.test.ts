import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { filterLocalizedFields } from './filterLocalizedFields'

describe('filterLocalizedFields', () => {
  describe('simple fields', () => {
    it('should keep localized text field', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const data = { title: 'Hello', other: 'World' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ title: 'Hello' })
    })

    it('should filter out non-localized text field', () => {
      const schema: Field[] = [{ name: 'slug', type: 'text' }]
      const data = { slug: 'hello-world' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should handle mixed localized and non-localized fields', () => {
      const schema: Field[] = [
        { name: 'title', type: 'text', localized: true },
        { name: 'slug', type: 'text' },
        { name: 'description', type: 'textarea', localized: true },
      ]
      const data = { title: 'Hello', slug: 'hello', description: 'World' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ title: 'Hello', description: 'World' })
    })

    it('should skip undefined values', () => {
      const schema: Field[] = [{ name: 'title', type: 'text', localized: true }]
      const data = {}

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })
  })

  describe('group fields', () => {
    it('should recursively filter group with localized nested field', () => {
      const schema: Field[] = [
        {
          name: 'seo',
          type: 'group',
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'canonical', type: 'text' },
          ],
        },
      ]
      const data = { seo: { title: 'SEO Title', canonical: '/page' } }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ seo: { title: 'SEO Title' } })
    })

    it('should exclude group if no localized fields inside', () => {
      const schema: Field[] = [
        {
          name: 'settings',
          type: 'group',
          fields: [{ name: 'enabled', type: 'checkbox' }],
        },
      ]
      const data = { settings: { enabled: true } }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })
  })

  describe('array fields', () => {
    it('should recursively filter array items', () => {
      const schema: Field[] = [
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'text', type: 'text', localized: true },
            { name: 'order', type: 'number' },
          ],
        },
      ]
      const data = {
        items: [
          { id: '1', text: 'First', order: 1 },
          { id: '2', text: 'Second', order: 2 },
        ],
      }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({
        items: [
          { id: '1', text: 'First' },
          { id: '2', text: 'Second' },
        ],
      })
    })

    it('should exclude array if no localized fields inside items', () => {
      const schema: Field[] = [
        {
          name: 'tags',
          type: 'array',
          fields: [{ name: 'name', type: 'text' }],
        },
      ]
      const data = { tags: [{ id: '1', name: 'tag1' }] }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })
  })

  describe('blocks fields', () => {
    it('should recursively filter blocks with blockType and id preserved', () => {
      const schema: Field[] = [
        {
          name: 'content',
          type: 'blocks',
          blocks: [
            {
              slug: 'text',
              fields: [
                { name: 'body', type: 'richText', localized: true },
                { name: 'alignment', type: 'select', options: ['left', 'center'] },
              ],
            },
          ],
        },
      ]
      const data = {
        content: [{ id: 'block1', blockType: 'text', body: { root: {} }, alignment: 'center' }],
      }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({
        content: [{ id: 'block1', blockType: 'text', body: { root: {} } }],
      })
    })

    it('should handle multiple block types', () => {
      const schema: Field[] = [
        {
          name: 'content',
          type: 'blocks',
          blocks: [
            {
              slug: 'heading',
              fields: [{ name: 'title', type: 'text', localized: true }],
            },
            {
              slug: 'image',
              fields: [{ name: 'alt', type: 'text', localized: true }],
            },
          ],
        },
      ]
      const data = {
        content: [
          { id: '1', blockType: 'heading', title: 'Hello' },
          { id: '2', blockType: 'image', alt: 'Image alt' },
        ],
      }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({
        content: [
          { id: '1', blockType: 'heading', title: 'Hello' },
          { id: '2', blockType: 'image', alt: 'Image alt' },
        ],
      })
    })
  })

  describe('tabs fields', () => {
    it('should process tabs as flat fields', () => {
      const schema: Field[] = [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'Content',
              fields: [{ name: 'title', type: 'text', localized: true }],
            },
            {
              label: 'Settings',
              fields: [{ name: 'slug', type: 'text' }],
            },
          ],
        },
      ]
      const data = { title: 'Hello', slug: 'hello' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ title: 'Hello' })
    })
  })

  describe('row/collapsible fields', () => {
    it('should process row fields as flat', () => {
      const schema: Field[] = [
        {
          type: 'row',
          fields: [
            { name: 'firstName', type: 'text', localized: true },
            { name: 'lastName', type: 'text', localized: true },
          ],
        },
      ]
      const data = { firstName: 'John', lastName: 'Doe' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' })
    })

    it('should process collapsible fields', () => {
      const schema: Field[] = [
        {
          type: 'collapsible',
          label: 'Advanced',
          fields: [{ name: 'meta', type: 'text', localized: true }],
        },
      ]
      const data = { meta: 'Some meta' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({ meta: 'Some meta' })
    })
  })

  describe('non-translatable fields', () => {
    it('should filter out localized number field', () => {
      const schema: Field[] = [{ name: 'count', type: 'number', localized: true }]
      const data = { count: 42 }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized checkbox field', () => {
      const schema: Field[] = [{ name: 'enabled', type: 'checkbox', localized: true }]
      const data = { enabled: true }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized select field', () => {
      const schema: Field[] = [{ name: 'status', type: 'select', options: ['draft', 'published'], localized: true }]
      const data = { status: 'draft' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized json field', () => {
      const schema: Field[] = [{ name: 'metadata', type: 'json', localized: true }]
      const data = { metadata: { key: 'value' } }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized code field', () => {
      const schema: Field[] = [{ name: 'snippet', type: 'code', localized: true }]
      const data = { snippet: 'const x = 1' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized point field', () => {
      const schema: Field[] = [{ name: 'location', type: 'point', localized: true }]
      const data = { location: [0, 0] }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized relationship field', () => {
      const schema: Field[] = [{ name: 'author', type: 'relationship', relationTo: 'users', localized: true }]
      const data = { author: '123' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized upload field', () => {
      const schema: Field[] = [{ name: 'image', type: 'upload', relationTo: 'media', localized: true }]
      const data = { image: '456' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized date field', () => {
      const schema: Field[] = [{ name: 'publishedAt', type: 'date', localized: true }]
      const data = { publishedAt: '2024-01-01' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should filter out localized email field', () => {
      const schema: Field[] = [{ name: 'contact', type: 'email', localized: true }]
      const data = { contact: 'test@example.com' }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({})
    })

    it('should keep translatable fields while filtering non-translatable', () => {
      const schema: Field[] = [
        { name: 'title', type: 'text', localized: true },
        { name: 'count', type: 'number', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'status', type: 'select', options: ['a', 'b'], localized: true },
        { name: 'body', type: 'richText', localized: true },
      ]
      const data = {
        title: 'Hello',
        count: 42,
        description: 'World',
        status: 'a',
        body: { root: {} },
      }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({
        title: 'Hello',
        description: 'World',
        body: { root: {} },
      })
    })
  })

  describe('nested structures', () => {
    it('should handle deeply nested localized fields', () => {
      const schema: Field[] = [
        {
          name: 'sections',
          type: 'array',
          fields: [
            {
              name: 'content',
              type: 'blocks',
              blocks: [
                {
                  slug: 'text',
                  fields: [
                    {
                      name: 'wrapper',
                      type: 'group',
                      fields: [{ name: 'body', type: 'richText', localized: true }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]
      const data = {
        sections: [
          {
            id: 's1',
            content: [{ id: 'b1', blockType: 'text', wrapper: { body: { root: {} } } }],
          },
        ],
      }

      const result = filterLocalizedFields(schema, data)

      expect(result).toEqual({
        sections: [
          {
            id: 's1',
            content: [{ id: 'b1', blockType: 'text', wrapper: { body: { root: {} } } }],
          },
        ],
      })
    })
  })
})
