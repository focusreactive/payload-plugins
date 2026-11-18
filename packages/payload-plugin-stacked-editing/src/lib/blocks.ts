import type { BlocksFieldClient, ClientBlock } from "payload";

export const blocksOf = (
  field: BlocksFieldClient,
  blocksMap: Record<string, ClientBlock> = {}
): ClientBlock[] => {
  if (!field.blockReferences) {
    return field.blocks ?? [];
  }
  return field.blockReferences
    .map((reference) => (typeof reference === "string" ? blocksMap[reference] : reference))
    .filter((block): block is ClientBlock => block !== undefined);
};

export const findBlock = (
  field: BlocksFieldClient,
  blockType: string,
  blocksMap: Record<string, ClientBlock> = {}
): ClientBlock | undefined =>
  blocksMap[blockType] ?? blocksOf(field, blocksMap).find((block) => block.slug === blockType);
