const PACKAGE_NAME = "@focus-reactive/payload-plugin-translator";

/**
 * Creates a full path to a client component for Payload's import map.
 * @param relativePath - Path relative to the client folder (e.g., 'widgets/translate-document/ui/TranslateDocument.server')
 */
export function clientComponentPath(relativePath: string): string {
  return `${PACKAGE_NAME}/client/${relativePath}`;
}
