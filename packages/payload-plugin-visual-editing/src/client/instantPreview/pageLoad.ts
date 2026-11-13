import { PACKAGE_NAME } from "../../shared/packageName.js";

const ID_RADIX = 36;
const FRACTION_PREFIX = "0.";
const PAGE_LOAD_ID = Symbol.for(`${PACKAGE_NAME}/pageLoadId`);

type LoadedWindow = Window & { [PAGE_LOAD_ID]?: string };

const randomId = () => Math.random().toString(ID_RADIX).slice(FRACTION_PREFIX.length);

export const pageLoadIdOf = (loadedWindow: LoadedWindow): string => {
  loadedWindow[PAGE_LOAD_ID] ??= randomId();
  return loadedWindow[PAGE_LOAD_ID];
};
