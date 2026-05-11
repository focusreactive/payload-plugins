export interface MappedGa4Error {
  status: number;
  message: string;
}

export function mapGa4Error(err: unknown): MappedGa4Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("INVALID_ARGUMENT"))
    return {
      status: 400,
      message: msg,
    };

  if (msg.includes("PERMISSION_DENIED"))
    return {
      status: 403,
      message: "GA4 service account lacks permission for this property",
    };

  if (msg.includes("RESOURCE_EXHAUSTED"))
    return {
      status: 429,
      message: "Analytics quota exceeded; try again in a few minutes",
    };

  if (msg.includes("UNAUTHENTICATED"))
    return {
      status: 500,
      message: "GA4 service account credentials are invalid",
    };

  return {
    status: 500,
    message: msg || "Unknown analytics error",
  };
}
