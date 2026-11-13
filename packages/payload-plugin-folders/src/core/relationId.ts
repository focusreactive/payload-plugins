import type { FolderId } from "../types.js";

/**
 * The id a relationship value stands for: the id itself, a populated document (its `id`), or the
 * `{ value }` wrapper a form holds for a relationship. An empty value and anything else give `null`.
 * Kept in its own module because the admin bundle imports it and must not pull in server code.
 */
export function relationIdOf<Id extends FolderId>(value: Id | { id: Id }): Id;
export function relationIdOf<Id extends FolderId>(
  value: Id | { id: Id } | null | undefined
): Id | null;
export function relationIdOf(value: unknown): FolderId | null;
export function relationIdOf(value: unknown): FolderId | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value === "" ? null : value;
  }
  if (value && typeof value === "object") {
    const { id, value: wrapped } = value as { id?: unknown; value?: unknown };

    return relationIdOf(id ?? wrapped);
  }

  return null;
}
