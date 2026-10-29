import { spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const stockServerPort = 4079;
export const stockServerUrl = `http://localhost:${stockServerPort}`;
export const stockServerPidFile = ".run/next-dev-stock.pid";

const isListening = async (): Promise<boolean> => {
  try {
    await fetch(stockServerUrl, { signal: AbortSignal.timeout(2000) });

    return true;
  } catch {
    return false;
  }
};

/**
 * Starts a second dev server on the same database with `admin.treeView: false`, in its own
 * build directory, and waits until the admin answers. It runs in its own process group; the saved
 * PID is how `stopStockServer` and the global teardown stop it, never a search by name.
 */
export const startStockServer = async (): Promise<void> => {
  if (await isListening()) {
    throw new Error(`Something is already listening on port ${stockServerPort}`);
  }
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set");
  }
  mkdirSync(".run", { recursive: true });
  const logDescriptor = openSync(".run/next-dev-stock.log", "w");
  const child = spawn(
    path.resolve("node_modules/.bin/next"),
    ["dev", "dev", "--port", String(stockServerPort)],
    {
      detached: true,
      env: {
        ...process.env,
        DATABASE_URI: `file:${path.join(databaseDirectory, "e2e.db")}`,
        FOLDERS_TREE_VIEW: "false",
        NEXT_DIST_DIR: ".next-stock",
        PAYLOAD_CONFIG_PATH: "./dev/payload.config.ts",
      },
      stdio: ["ignore", logDescriptor, logDescriptor],
    }
  );
  closeSync(logDescriptor);
  child.unref();
  if (child.pid === undefined) {
    throw new Error("The stock-list server did not start");
  }
  writeFileSync(stockServerPidFile, String(child.pid));

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${stockServerUrl}/admin`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("The stock-list server did not answer on /admin within 3 minutes");
};

export const stopStockServer = (): void => {
  try {
    const processId = Number(readFileSync(stockServerPidFile, "utf-8").trim());
    if (Number.isInteger(processId) && processId > 1) {
      process.kill(-processId, "SIGTERM");
    }
  } catch {
    // Already gone.
  }
  rmSync(stockServerPidFile, { force: true });
};
