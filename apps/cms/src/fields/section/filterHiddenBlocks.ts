export function filterHiddenBlocks<T extends { _hidden?: boolean | null }>(
  blocks: T[] | null | undefined
): T[] {
  if (!blocks) {
    return [];
  }

  return blocks.filter((block) => block?._hidden !== true);
}
