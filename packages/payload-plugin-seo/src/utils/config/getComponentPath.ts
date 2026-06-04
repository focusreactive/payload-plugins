import { PKG } from "../../constants";

export function getComponentPath(subpath: string, exportName = "SeoButton"): string {
  return `${PKG}/${subpath}#${exportName}`;
}
