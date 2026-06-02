import { PACKAGE_NAME } from "../../constants";

export function getComponentPath(componentPath: string, componentName?: string) {
  return `${PACKAGE_NAME}/${componentPath}#${componentName ?? "default"}`;
}
