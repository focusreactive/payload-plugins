/**
 * Composes functions left-to-right, passing the result of each to the next.
 */
export const pipe =
  <T>(...fns: ((x: T) => T)[]) =>
  (x: T): T =>
    fns.reduce((acc, fn) => fn(acc), x);
