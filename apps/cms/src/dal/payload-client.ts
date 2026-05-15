import configPromise from "@payload-config";
import { getPayload } from 'payload';
import type { Payload } from 'payload';
import { cache } from "react";

/**
 * The single entry point for obtaining a Payload Local API client in
 * app-layer code (route handlers, server components, sitemap, etc.).
 *
 * Memoized per render via `react.cache` so repeated DAL calls within one
 * request share the same Payload instance. Never call `getPayload` directly
 * outside this module — go through the DAL.
 */
export const getPayloadClient = cache(async (): Promise<Payload> => getPayload({ config: configPromise }));
