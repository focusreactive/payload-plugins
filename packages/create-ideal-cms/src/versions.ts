import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const NPM_REGISTRY = "https://registry.npmjs.org";
const REGISTRY_TIMEOUT_MS = 8000;

type Manifest = { name: string; version: string; private?: boolean };

// semantic-release commits each released version back into the plugin's package.json.
export async function readPluginVersions(templateDir: string): Promise<Record<string, string>> {
  const packagesDir = join(templateDir, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const file = join(packagesDir, entry.name, "package.json");
        return JSON.parse(await readFile(file, "utf-8")) as Manifest;
      })
  );
  return Object.fromEntries(manifests.filter((m) => !m.private).map((m) => [m.name, m.version]));
}

async function fetchPublishedVersion(
  name: string,
  versionOrTag: string
): Promise<string | undefined> {
  const res = await fetch(`${NPM_REGISTRY}/${name}/${versionOrTag}`, {
    signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
  });
  if (!res.ok) return undefined;
  const { version } = (await res.json()) as Manifest;
  return version;
}

export async function resolvePublishedVersion(
  name: string,
  templateVersion: string
): Promise<string> {
  try {
    return (
      (await fetchPublishedVersion(name, templateVersion)) ??
      (await fetchPublishedVersion(name, "latest")) ??
      templateVersion
    );
  } catch {
    return templateVersion;
  }
}
