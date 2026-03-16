export function getDefaultErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;

  if (typeof err === "string") return err;

  return "An unexpected error occurred";
}
