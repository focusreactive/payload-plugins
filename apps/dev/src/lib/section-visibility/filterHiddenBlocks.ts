export interface MaybeHiddenBlock {
  _hidden?: boolean | null;
  [key: string]: unknown;
}

export function filterHiddenBlocks<T extends MaybeHiddenBlock>(blocks: T[] | null | undefined): T[] {
  if (!blocks) {
    return [];
  }

  return blocks.filter((block) => block?._hidden !== true);
}
