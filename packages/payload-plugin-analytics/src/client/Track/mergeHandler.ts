export function mergeHandler<E>(
  original: ((e: E) => void) | undefined,
  ours: (e: E) => void
): (e: E) => void {
  return (e) => {
    ours(e);
    original?.(e);
  };
}
