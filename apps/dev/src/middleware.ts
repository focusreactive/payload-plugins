import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createResolveAbRewrite } from '@focus-reactive/payload-plugin-ab/middleware'
import { abAdapter as storage } from './lib/ab-testing/dbAdapter'
import { VariantData } from './lib/ab-testing/types'

const resolveAbRewrite = createResolveAbRewrite<VariantData>({
  storage,
  getBucket: (v) => v.bucket,
  getRewritePath: (v) => v.rewritePath,
  getPassPercentage: (v) => v.passPercentage,
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const result = await resolveAbRewrite(request as any, pathname, pathname, pathname)
  return result ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
