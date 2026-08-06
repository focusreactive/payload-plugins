// A pre-authorized MCP endpoint for the content sandbox on this branch. Chat clients that add
// connectors by URL (Claude, ChatGPT) cannot send an Authorization header, so this route injects
// a server-held API key and forwards to the plugin's /api/mcp. The key is scoped to a sandbox
// user (read + draft, no delete) and lives in a branch-scoped env var, never in this public repo.

const upstreamUrl = (): string => {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  // The self-fetch re-enters Vercel's deployment protection, and for API routes the bypass
  // secret only works as a query parameter, not as a header. PREVIEW_BYPASS_SECRET is the
  // explicit fallback because the system-injected variable is not guaranteed on this project.
  const bypassSecret =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? process.env.PREVIEW_BYPASS_SECRET
  return `${base}/api/mcp${bypassSecret ? `?x-vercel-protection-bypass=${bypassSecret}` : ''}`
}

const forward = async (request: Request): Promise<Response> => {
  const apiKey = process.env.MCP_OPEN_API_KEY
  if (!apiKey) {
    return Response.json(
      {error: 'MCP_OPEN_API_KEY is not configured for this deployment'},
      {status: 503},
    )
  }

  const headers = new Headers(request.headers)
  headers.set('authorization', `Bearer ${apiKey}`)
  headers.delete('host')
  headers.delete('content-length')

  // MCP requests are small JSON-RPC payloads: buffering sidesteps streamed-request quirks,
  // while SSE responses below still stream through untouched.
  const requestBody = request.method === 'POST' ? await request.arrayBuffer() : undefined

  const upstreamResponse = await fetch(upstreamUrl(), {
    method: request.method,
    headers,
    body: requestBody,
  })

  const responseHeaders = new Headers(upstreamResponse.headers)
  // fetch already decompressed the body, so passing these through corrupts the response
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}

export const POST = forward
export const GET = forward
export const DELETE = forward
