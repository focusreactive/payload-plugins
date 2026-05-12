import { describe, it, expect } from 'vitest'
import { isObject } from './isObject'

describe('isObject', () => {
  describe('returns true for objects', () => {
    it('returns true for plain object', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
    })

    it('returns true for nested object', () => {
      expect(isObject({ nested: { deep: true } })).toBe(true)
    })

    it('returns true for array (arrays are objects)', () => {
      expect(isObject([])).toBe(true)
      expect(isObject([1, 2, 3])).toBe(true)
    })

    it('returns true for Date', () => {
      expect(isObject(new Date())).toBe(true)
    })

    it('returns true for RegExp', () => {
      expect(isObject(/test/)).toBe(true)
    })

    it('returns true for object created with Object.create', () => {
      expect(isObject(Object.create(null))).toBe(true)
    })
  })

  describe('returns false for non-objects', () => {
    it('returns false for null', () => {
      expect(isObject(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isObject(undefined)).toBe(false)
    })

    it('returns false for string', () => {
      expect(isObject('')).toBe(false)
      expect(isObject('hello')).toBe(false)
    })

    it('returns false for number', () => {
      expect(isObject(0)).toBe(false)
      expect(isObject(42)).toBe(false)
      expect(isObject(NaN)).toBe(false)
    })

    it('returns false for boolean', () => {
      expect(isObject(true)).toBe(false)
      expect(isObject(false)).toBe(false)
    })

    it('returns false for symbol', () => {
      expect(isObject(Symbol('test'))).toBe(false)
    })

    it('returns false for bigint', () => {
      expect(isObject(BigInt(123))).toBe(false)
    })

    it('returns false for function', () => {
      expect(isObject(() => {})).toBe(false)
      expect(isObject(function () {})).toBe(false)
    })
  })
})
