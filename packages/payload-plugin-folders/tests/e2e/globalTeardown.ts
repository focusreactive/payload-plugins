import { rm } from "node:fs/promises";

import { stopStockServer } from "./helpers/stockServer.js";

export default async function globalTeardown() {
  // A run stopped halfway can leave the stock-list server behind; its saved PID, checked against
  // the port's listener, is the only way it is ever stopped.
  stopStockServer();
  await rm(".run/next-dev.pid", { force: true });
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (databaseDirectory) {
    await rm(databaseDirectory, { force: true, recursive: true });
  }
}
