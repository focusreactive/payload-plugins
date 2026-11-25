import type { CollectionConfig, GlobalConfig } from "payload";

type VersionsConfig = CollectionConfig["versions"] | GlobalConfig["versions"];

const draftsOf = (versions: VersionsConfig) =>
  versions && typeof versions === "object" ? versions.drafts : undefined;

export const hasDrafts = (versions: VersionsConfig): boolean => Boolean(draftsOf(versions));

export const hasAutosave = (versions: VersionsConfig): boolean => {
  const drafts = draftsOf(versions);
  return Boolean(drafts && typeof drafts === "object" && drafts.autosave);
};

type SaveArgs = { autosave?: unknown; draft?: unknown; data?: unknown };

const submittedStatusOf = (data: unknown): unknown =>
  typeof data === "object" && data !== null ? (data as { _status?: unknown })._status : undefined;

export const isAutosaveDraftTick = (hasAutosaveEnabled: boolean, args: SaveArgs): boolean =>
  Boolean(args.autosave) &&
  Boolean(args.draft) &&
  hasAutosaveEnabled &&
  submittedStatusOf(args.data) !== "published";
