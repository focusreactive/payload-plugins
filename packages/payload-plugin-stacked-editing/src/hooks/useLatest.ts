import { useRef } from "react";
import type { RefObject } from "react";

export const useLatest = <T>(value: T): RefObject<T> => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
