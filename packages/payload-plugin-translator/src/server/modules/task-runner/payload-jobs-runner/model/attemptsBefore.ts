/**
 * Payload's `totalTried` counts the attempts before the current one and is absent on the first, so a
 * first run reads zero (`payload/dist/queues/errors/handleTaskError.js:54`).
 */
export const attemptsBefore = (tried: { totalTried?: unknown } | undefined): number => {
  return typeof tried?.totalTried === "number" ? tried.totalTried : 0;
};
