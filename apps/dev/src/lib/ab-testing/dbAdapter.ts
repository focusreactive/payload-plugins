import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'
import { VariantData } from './types'

export const abAdapter = payloadGlobalAdapter<VariantData>({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
})
