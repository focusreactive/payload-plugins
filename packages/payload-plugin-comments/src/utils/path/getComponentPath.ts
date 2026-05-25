import { detectPluginBasePath } from "./detectPluginBasePath";

export function getComponentPath(componentPath: string, componentName: string) {
  return `${detectPluginBasePath()}/${componentPath}#${componentName}`;
}

interface GetComponentConfigProps {
  componentPath: string;
  componentName: string;
  clientProps?: Record<string, any>;
  serverProps?: Record<string, any>;
}

export function getComponentConfig({
  componentPath,
  componentName,
  clientProps,
  serverProps,
}: GetComponentConfigProps) {
  return {
    path: `${detectPluginBasePath()}/${componentPath}`,
    exportName: componentName,
    clientProps,
    serverProps,
  };
}
