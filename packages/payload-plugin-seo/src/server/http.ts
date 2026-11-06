import type { PayloadRequest } from "payload";

export function jsonResponse(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

export async function readJsonBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}
