import path from "node:path";

/**
 * Writes a folder's full path straight into the end-to-end database, in every locale, the way a
 * script outside the plugin would: no hook runs and the tree revision stays where it is. That is
 * the drift the quick verify exists to find. `@libsql/client` is the SQLite driver Payload's
 * adapter already uses, so the dev server and this write share the file.
 */
export const writeFolderPathDrift = async (folderId: number, fullPath: string): Promise<void> => {
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set: playwright.config.ts sets it");
  }
  const { createClient } = await import("@libsql/client");
  const client = createClient({ url: `file:${path.join(databaseDirectory, "e2e.db")}` });
  try {
    const result = await client.execute({
      args: [fullPath, folderId],
      sql: "UPDATE folders_locales SET full_path = ? WHERE _parent_id = ?",
    });
    if (result.rowsAffected === 0) {
      throw new Error(`Folder ${folderId} has no locale rows to put drift into`);
    }
  } finally {
    client.close();
  }
};
