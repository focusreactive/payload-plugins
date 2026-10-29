import { rm } from "node:fs/promises";

export default async function globalTeardown() {
  await rm(".run/next-dev.pid", { force: true });
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (databaseDirectory) {
    await rm(databaseDirectory, { force: true, recursive: true });
  }
}
