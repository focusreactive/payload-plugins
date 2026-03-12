type Object = Record<string, unknown>

export function getValueByPath(obj: Object, path: string) {
  if (!path) return null

  const segments = path.split('.')
  let current: unknown = obj

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object' ||
      Array.isArray(current)
    ) {
      return null
    }
    current = (current as Object)[segment]
  }

  if (current === null || current === undefined) return null
  if (typeof current === 'string') return current === '' ? null : current
  if (typeof current === 'number' || typeof current === 'boolean') return String(current)
    
  return null
}
