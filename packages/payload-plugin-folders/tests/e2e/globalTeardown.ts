import { rm } from "node:fs/promises";

export default async function globalTeardown() {
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (databaseDirectory) {
    await rm(databaseDirectory, { force: true, recursive: true });
  }
}
