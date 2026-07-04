const PREFIX = "frseo";

const COMPONENT_CLASS_PREFIX = "frseo-";

export function prefixClassList(classList: string): string {
  return classList
    .split(/(\s+)/u)
    .map((part) => {
      if (part === "" || /^\s+$/u.test(part)) {
        return part;
      }
      if (part.startsWith(`${PREFIX}:`) || part.startsWith(COMPONENT_CLASS_PREFIX)) {
        return part;
      }
      return `${PREFIX}:${part}`;
    })
    .join("");
}
