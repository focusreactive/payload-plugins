function normalize(path: string): string {
  return path
    .split(".")
    .filter((seg) => !/^\d+$/u.test(seg))
    .join(".");
}

export function makeExcluded(metadataPaths: string[], exclude: string[]): (path: string) => boolean {
  const set = new Set([...metadataPaths, ...exclude].filter(Boolean));

  return (path) => {
    const n = normalize(path);

    for (const p of set) {
      if (n === p || n.startsWith(`${p}.`)) return true;
    }

    return false;
  };
}

export function makeIncluded(include: string[]): (path: string) => boolean {
  const list = include.filter(Boolean);
  if (list.length === 0) return () => true;

  return (path) => {
    const n = normalize(path);

    for (const p of list) {
      if (n === p || n.startsWith(`${p}.`) || p.startsWith(`${n}.`)) return true;
    }

    return false;
  };
}
