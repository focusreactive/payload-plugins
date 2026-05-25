import { describe, it, expect } from 'vitest'
import { isEmpty } from './isEmpty'

describe('isEmpty', () => {
  describe('null and undefined', () => {
    it('returns true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true)
    })

    it('returns true for null', () => {
      expect(isEmpty(null)).toBe(true)
    })
  })

  describe('strings', () => {
    it('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true)
    })

    it('returns true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true)
      expect(isEmpty('\t\n')).toBe(true)
    })

    it('returns false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty('  hello  ')).toBe(false)
    })
  })

  describe('arrays', () => {
    it('returns true for empty array', () => {
      expect(isEmpty([])).toBe(true)
    })

    it('returns false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false)
      expect(isEmpty([null])).toBe(false)
      expect(isEmpty([''])).toBe(false)
    })
  })

  describe('objects', () => {
    it('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true)
    })

    it('returns false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false)
      expect(isEmpty({ key: null })).toBe(false)
      expect(isEmpty({ key: undefined })).toBe(false)
    })
  })

  describe('other types', () => {
    it('returns false for numbers', () => {
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(1)).toBe(false)
      expect(isEmpty(-1)).toBe(false)
      expect(isEmpty(NaN)).toBe(false)
    })

    it('returns false for booleans', () => {
      expect(isEmpty(false)).toBe(false)
      expect(isEmpty(true)).toBe(false)
    })

    it('returns false for functions', () => {
      expect(isEmpty(() => {})).toBe(false)
    })
  })
})
