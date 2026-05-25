import { describe, it, expect } from 'vitest'
import { setByPath } from './setByPath'

describe('setByPath', () => {
  it('sets top-level property', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'title', 'Hello')
    expect(obj.title).toBe('Hello')
  })

  it('sets nested property creating intermediate objects', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'a.b.c', 1)
    expect(obj).toEqual({ a: { b: { c: 1 } } })
  })

  it('sets array element creating intermediate array', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'arr.0', 'first')
    expect(obj).toEqual({ arr: ['first'] })
  })

  it('sets nested property in array', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'items.0.name', 'first')
    expect(obj).toEqual({ items: [{ name: 'first' }] })
  })

  it('overwrites existing value', () => {
    const obj: Record<string, unknown> = { title: 'Old' }
    setByPath(obj, 'title', 'New')
    expect(obj.title).toBe('New')
  })

  it('preserves existing structure', () => {
    const obj: Record<string, unknown> = { a: { x: 1 } }
    setByPath(obj, 'a.y', 2)
    expect(obj).toEqual({ a: { x: 1, y: 2 } })
  })

  it('handles complex path with mixed objects and arrays', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, 'body.0.content.root', { children: [] })
    expect(obj).toEqual({
      body: [{ content: { root: { children: [] } } }],
    })
  })

  it('sets value in existing array', () => {
    const obj: Record<string, unknown> = { arr: ['a', 'b', 'c'] }
    setByPath(obj, 'arr.1', 'X')
    expect(obj.arr).toEqual(['a', 'X', 'c'])
  })
})
