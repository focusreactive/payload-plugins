export function toBracketParams(
  value: unknown,
  prefix = "where",
  params = new URLSearchParams()
): URLSearchParams {
  if (value === null || value === undefined) return params;
  if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      toBracketParams(inner, `${prefix}[${key}]`, params);
    }
  } else {
    params.append(prefix, String(value));
  }
  return params;
}
