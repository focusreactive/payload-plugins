import { cache } from 'react'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

/**
 * The single entry point for obtaining a Payload Local API client in
 * app-layer code (route handlers, server components, sitemap, etc.).
 *
 * Memoized per render via `react.cache` so repeated DAL calls within one
 * request share the same Payload instance. Never call `getPayload` directly
 * outside this module — go through the DAL.
 */
export const getPayloadClient = cache(async (): Promise<Payload> => {
  return getPayload({ config: configPromise })
})
