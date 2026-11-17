import { isPlainObject } from "./plainObject.js";

export function isSameValue(one: unknown, other: unknown): boolean {
  if (Object.is(one, other)) return true;
  if (Array.isArray(one) || Array.isArray(other)) {
    return (
      Array.isArray(one) &&
      Array.isArray(other) &&
      one.length === other.length &&
      one.every((item, index) => isSameValue(item, other[index]))
    );
  }
  if (!isPlainObject(one) || !isPlainObject(other)) return false;
  const keys = Object.keys(one);
  return (
    keys.length === Object.keys(other).length &&
    keys.every((key) => Object.hasOwn(other, key) && isSameValue(one[key], other[key]))
  );
}
