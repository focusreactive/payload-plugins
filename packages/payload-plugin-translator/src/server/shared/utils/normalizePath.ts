/**
 * Normalizes a URL path segment.
 * - Ensures the path starts with a single slash
 * - Removes trailing slashes
 * - Handles empty/whitespace input
 *
 * @example
 * normalizePath('translate')      // '/translate'
 * normalizePath('/translate')     // '/translate'
 * normalizePath('/translate/')    // '/translate'
 * normalizePath('//translate//')  // '/translate'
 * normalizePath('')               // ''
 * normalizePath('  ')             // ''
 */
export function normalizePath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''

  // Remove leading/trailing slashes, then add single leading slash
  const normalized = trimmed.replace(/^\/+|\/+$/g, '')
  return normalized ? `/${normalized}` : ''
}
