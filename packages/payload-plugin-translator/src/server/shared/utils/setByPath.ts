import { isObject } from "./isObject";

/**
 * Sets a value in an object by dot-notation path.
 * Creates intermediate objects/arrays as needed.
 *
 * @example
 * const obj = {}
 * setByPath(obj, 'a.b', 1) // { a: { b: 1 } }
 * setByPath(obj, 'arr.0.x', 1) // { arr: [{ x: 1 }] }
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];

    if (!isObject(current[key])) {
      // Create array if next key is numeric, otherwise object
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }

    current = current[key] as Record<string, unknown>;
  }

  // biome-ignore lint/style/noNonNullAssertion: path is split on '.' so keys is non-empty
  const lastKey = keys.at(-1)!;
  current[lastKey] = value;
}
