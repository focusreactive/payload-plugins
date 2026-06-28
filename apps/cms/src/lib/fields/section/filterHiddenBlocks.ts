export function filterHiddenBlocks<T extends object>(blocks: T[] | null | undefined): T[] {
  if (!blocks) {
    return [];
  }

  return blocks.filter((block) => (block as { _hidden?: boolean | null })?._hidden !== true);
}
