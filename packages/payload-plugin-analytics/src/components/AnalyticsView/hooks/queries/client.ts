export class AnalyticsHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AnalyticsHttpError";
  }
}

export interface AnalyticsFetchOptions {
  signal?: AbortSignal;
}

const API_BASE = "/api";

export async function analyticsFetch<TBody, TRes>(
  path: string,
  body: TBody,
  opts: AnalyticsFetchOptions = {},
): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
    signal: opts.signal,
  });

  if (!res.ok) {
    let message = res.statusText;

    try {
      const raw = (await res.json()) as { error?: unknown };

      if (typeof raw?.error === "string") message = raw.error;
    } catch {}

    throw new AnalyticsHttpError(res.status, message);
  }

  return (await res.json()) as TRes;
}
