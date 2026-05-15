export function buildStablePath(
  positionPath: string,
  getRowId: (positionalIdPath: string) => string | undefined
) {
  const segments = positionPath.split(".");
  const result: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i] ?? "";

    if (/^\d+$/.test(seg)) {
      const positionalParent = segments.slice(0, i).join(".");
      const idPath = positionalParent
        ? `${positionalParent}.${seg}.id`
        : `${seg}.id`;

      result.push(getRowId(idPath) ?? seg);
    } else {
      result.push(seg);
    }
  }

  return result.join(".");
}
