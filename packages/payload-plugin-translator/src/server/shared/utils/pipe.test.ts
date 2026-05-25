import { describe, it, expect } from 'vitest'
import { pipe } from './pipe'

describe('pipe', () => {
  it('returns input unchanged when no functions provided', () => {
    const result = pipe<number>()(5)
    expect(result).toBe(5)
  })

  it('applies single function', () => {
    const double = (x: number) => x * 2
    const result = pipe(double)(5)
    expect(result).toBe(10)
  })

  it('composes functions left-to-right', () => {
    const add1 = (x: number) => x + 1
    const double = (x: number) => x * 2
    const subtract3 = (x: number) => x - 3

    // (5 + 1) * 2 - 3 = 9
    const result = pipe(add1, double, subtract3)(5)
    expect(result).toBe(9)
  })

  it('works with string transformations', () => {
    const trim = (s: string) => s.trim()
    const upper = (s: string) => s.toUpperCase()
    const exclaim = (s: string) => s + '!'

    const result = pipe(trim, upper, exclaim)('  hello  ')
    expect(result).toBe('HELLO!')
  })

  it('works with object transformations', () => {
    type Obj = { count: number; label: string }

    const incrementCount = (obj: Obj): Obj => ({ ...obj, count: obj.count + 1 })
    const upperLabel = (obj: Obj): Obj => ({ ...obj, label: obj.label.toUpperCase() })

    const result = pipe(incrementCount, upperLabel)({ count: 0, label: 'test' })
    expect(result).toEqual({ count: 1, label: 'TEST' })
  })

  it('works with array transformations', () => {
    const addElement = (arr: number[]) => [...arr, arr.length]
    const doubleAll = (arr: number[]) => arr.map((x) => x * 2)

    const result = pipe(addElement, doubleAll)([1, 2, 3])
    expect(result).toEqual([2, 4, 6, 6]) // [1,2,3,3] -> [2,4,6,6]
  })

  it('maintains type safety', () => {
    const toString = (x: number): number => x
    const parse = (x: number): number => x + 1

    // This should compile and work
    const result = pipe(toString, parse)(42)
    expect(result).toBe(43)
  })

  it('can be reused', () => {
    const add1 = (x: number) => x + 1
    const double = (x: number) => x * 2

    const transform = pipe(add1, double)

    expect(transform(1)).toBe(4) // (1 + 1) * 2
    expect(transform(5)).toBe(12) // (5 + 1) * 2
    expect(transform(10)).toBe(22) // (10 + 1) * 2
  })
})
