/**
 * The read-side mirror of `enforcedAtTheWrite`: the host's own `read` rule decides, and with nobody
 * to name the read is unchecked — the same answer unattributed writes have always had.
 *
 * `disableErrors` is unconditional and is the half that cannot be omitted. Payload calls
 * `killTransaction` from the catch of every operation (`findByID.js`, `find.js`), so a refusal that
 * throws inside the editor's `afterChange` rolls back the save that triggered it. Returning nothing
 * instead of throwing is what keeps a refused translation from costing the editor their work.
 */
export function enforcedAtTheRead(
  user: Record<string, unknown> | null | undefined
):
  | { overrideAccess: false; user: Record<string, unknown>; disableErrors: true }
  | { disableErrors: true } {
  if (user == null) return { disableErrors: true };
  return { overrideAccess: false, user, disableErrors: true };
}
