export function pathFor(ref: string): string {
  if (ref === "__home") return "/";
  return `/${ref.split(":")[1] ?? ref}`;
}
