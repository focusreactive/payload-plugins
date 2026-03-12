export function parseMentionIds(text: string): number[] {
  const ids = new Set<number>();
  const pattern = /@\((\d+)\)/g;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    ids.add(Number(match[1]));
  }

  return Array.from(ids);
}
