const ZERO_WIDTH_SPACE = /\u200B/g;

function serializeNode(node: ChildNode, output: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(ZERO_WIDTH_SPACE, "");

    output.push(text);

    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const {mentionId} = element.dataset;

    if (mentionId !== undefined) {
      output.push(`@(${mentionId})`);

      return;
    }

    for (const child of [...element.childNodes]) {
      serializeNode(child, output);
    }
  }
}

export function serializeEditor(root: HTMLElement): string {
  const parts: string[] = [];

  for (const child of [...root.childNodes]) {
    serializeNode(child, parts);
  }

  return parts.join("");
}
