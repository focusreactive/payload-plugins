export function whereFieldPaths(where: unknown, paths = new Set<string>()): string[] {
  if (Array.isArray(where)) {
    for (const condition of where) whereFieldPaths(condition, paths);
  } else if (where && typeof where === "object") {
    for (const [key, value] of Object.entries(where)) {
      if (key === "and" || key === "or") whereFieldPaths(value, paths);
      else paths.add(key);
    }
  }
  return [...paths];
}
