const inFlight = new Map<string, Promise<unknown>>();

/**
 * Runs `read` once for everyone who asks with the same key while it is still pending. The edit
 * view's sidebar fields are separate components that need the same answer from the server (the
 * live row, the folder's root page); this turns their requests into one.
 */
export const sharedRead = <Value>(key: string, read: () => Promise<Value>): Promise<Value> => {
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<Value>;
  }
  const run = async (): Promise<Value> => {
    try {
      return await read();
    } finally {
      inFlight.delete(key);
    }
  };
  const promise = run();
  inFlight.set(key, promise);

  return promise;
};
