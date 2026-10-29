import { readFile, rm } from "node:fs/promises";

import { stockServerPidFile } from "./helpers/stockServer.js";

export default async function globalTeardown() {
  // A run stopped halfway can leave the stock-list server behind; its saved PID is the only way
  // it is ever stopped.
  try {
    const processId = Number((await readFile(stockServerPidFile, "utf-8")).trim());
    if (Number.isInteger(processId) && processId > 1) {
      process.kill(-processId, "SIGTERM");
    }
  } catch {
    // No PID file, or the process is gone already.
  }
  await rm(stockServerPidFile, { force: true });
  await rm(".run/next-dev.pid", { force: true });
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (databaseDirectory) {
    await rm(databaseDirectory, { force: true, recursive: true });
  }
}
