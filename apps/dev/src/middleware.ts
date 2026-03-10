import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createResolveAbRewrite } from '@focus-reactive/payload-plugin-ab/middleware'
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const storage = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
})

const resolveAbRewrite = createResolveAbRewrite({
  storage,
  getBucket: (v) => v.bucket,
  getRewritePath: (v) => v.rewritePath,
  getPassPercentage: (v) => v.passPercentage,
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const result = await resolveAbRewrite(request, pathname, pathname, pathname)
  return result ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
