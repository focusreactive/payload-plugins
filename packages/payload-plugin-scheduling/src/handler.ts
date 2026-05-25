import type { PayloadHandler, PayloadRequest } from 'payload'

export function createSchedulePublicationHandler(secret: string, queue: string): PayloadHandler {
  return async (req: PayloadRequest) => {
    if (!secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const result = await req.payload.jobs.run({ queue })

      return Response.json({
        ok: true,
        ...(result ? { message: result } : {}),
      })
    } catch {
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
