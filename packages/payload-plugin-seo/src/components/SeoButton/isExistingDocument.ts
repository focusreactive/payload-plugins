export function isExistingDocument(id: string | number | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  if (typeof id === "string") return id.trim().length > 0;

  return true;
}
