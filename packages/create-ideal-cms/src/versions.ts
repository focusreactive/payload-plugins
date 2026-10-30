import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// name -> exact version to pin in the scaffolded apps/cms/package.json
export type PluginVersions = Record<string, string>;

const REGISTRY = "https://registry.npmjs.org";
const REGISTRY_TIMEOUT_MS = 8000;

type PackageManifest = { name?: string; version?: string; private?: boolean };

// semantic-release commits the released version back into each plugin's
// package.json, so the template's own manifests name exactly the versions that
// were published from the same commit as the apps/cms code we're scaffolding.
// Must run before the plugin packages are pruned from the template.
export async function readTemplatePluginVersions(templateDir: string): Promise<PluginVersions> {
  const packagesDir = join(templateDir, "packages");
  let entries: string[];
  try {
    entries = await readdir(packagesDir);
  } catch {
    return {};
  }

  const versions: PluginVersions = {};
  await Promise.all(
    entries.map(async (entry) => {
      let manifest: PackageManifest;
      try {
        manifest = JSON.parse(
          await readFile(join(packagesDir, entry, "package.json"), "utf-8")
        ) as PackageManifest;
      } catch {
        return;
      }
      if (manifest.private === true || !manifest.name || !manifest.version) return;
      versions[manifest.name] = manifest.version;
    })
  );
  return versions;
}

async function fetchManifest(path: string): Promise<{ status: number; version?: string }> {
  const res = await fetch(`${REGISTRY}/${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
  });
  if (!res.ok) return { status: res.status };
  const body = (await res.json()) as PackageManifest;
  return { status: res.status, version: body.version };
}

function encodeName(name: string): string {
  return name.replace("/", "%2f");
}

export type ResolvedVersion = { version: string; source: "template" | "npm-latest" };

// Picks the version to pin for a plugin the scaffold consumes from npm:
// 1. the template's version, if npm actually has it (a release job can fail
//    after the version commit, or a package may never have been published);
// 2. otherwise npm's `latest` dist-tag.
// When the registry is unreachable we trust the template rather than block
// the scaffold — the user's install will surface any real problem.
export async function resolvePluginVersion(
  name: string,
  templateVersion: string | undefined
): Promise<ResolvedVersion> {
  try {
    if (templateVersion) {
      const exact = await fetchManifest(`${encodeName(name)}/${templateVersion}`);
      if (exact.version) return { version: exact.version, source: "template" };
      if (exact.status !== 404) return { version: templateVersion, source: "template" };
    }
    const latest = await fetchManifest(`${encodeName(name)}/latest`);
    if (latest.version) return { version: latest.version, source: "npm-latest" };
  } catch {
    if (templateVersion) return { version: templateVersion, source: "template" };
  }
  throw new Error(`Could not resolve a published version of ${name} from npm.`);
}
