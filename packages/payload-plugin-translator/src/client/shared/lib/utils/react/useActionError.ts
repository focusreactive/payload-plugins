import { useCallback, useState } from "react";

const asError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

/** The failure of the last action started here; starting another clears it. */
export function useActionError() {
  const [error, setError] = useState<Error | null>(null);
  const run = useCallback((action: () => Promise<unknown>) => {
    setError(null);
    const settle = async () => {
      try {
        await action();
      } catch (reason) {
        setError(asError(reason));
      }
    };
    void settle();
  }, []);
  return { error, run };
}
