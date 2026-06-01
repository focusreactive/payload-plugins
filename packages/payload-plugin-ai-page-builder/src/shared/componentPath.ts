const PACKAGE_NAME = "@focus-reactive/payload-plugin-ai-page-builder";

export function adminComponentPath(relativePath: string): string {
  return `${PACKAGE_NAME}/admin/${relativePath}`;
}
