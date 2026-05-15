import { isObject } from "./isObject";

/**
 * Gets a value from an object by dot-notation path.
 *
 * @example
 * getByPath({ a: { b: 1 } }, 'a.b') // 1
 * getByPath({ arr: [{ x: 1 }] }, 'arr.0.x') // 1
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (!isObject(current)) {return undefined;}
    current = current[key];
  }

  return current;
}
