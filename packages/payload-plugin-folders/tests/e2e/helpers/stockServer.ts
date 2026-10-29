import { execFileSync, spawn } from "node:child_process";
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

/** What stopping needs from the machine; tests replace it. */
export type StopDependencies = {
  kill: (processId: number, signal: NodeJS.Signals) => void;
  /** Process ids listening on the stock server's port. */
  listenerProcessIds: () => number[];
  /** The process group of a process, or `null` when it is gone. */
  processGroupOf: (processId: number) => number | null;
};

const defaultStopDependencies: StopDependencies = {
  kill: (processId, signal) => process.kill(processId, signal),
  listenerProcessIds: () => {
    try {
      return execFileSync("lsof", ["-tiTCP:4079", "-sTCP:LISTEN"], { encoding: "utf-8" })
        .split("\n")
        .map((line) => Number(line.trim()))
        .filter((processId) => Number.isInteger(processId) && processId > 1);
    } catch {
      // lsof exits 1 when nothing listens.
      return [];
    }
  },
  processGroupOf: (processId) => {
    try {
      const group = Number(
        execFileSync("ps", ["-o", "pgid=", "-p", String(processId)], { encoding: "utf-8" }).trim()
      );

      return Number.isInteger(group) ? group : null;
    } catch {
      return null;
    }
  },
};

/**
 * Stops the stock-list server named by the PID file, and only that one. A PID file that outlived
 * its server may name a process that now belongs to someone else, so the group is signalled only
 * when the saved PID leads the group of the process listening on the server's port.
 */
export const stopStockServerFromPidFile = (
  pidFile: string,
  dependencies: StopDependencies = defaultStopDependencies
): boolean => {
  try {
    const savedProcessId = Number(readFileSync(pidFile, "utf-8").trim());
    if (Number.isInteger(savedProcessId) && savedProcessId > 1) {
      const ownsListener = dependencies
        .listenerProcessIds()
        .some(
          (listener) =>
            listener === savedProcessId || dependencies.processGroupOf(listener) === savedProcessId
        );
      if (ownsListener) {
        dependencies.kill(-savedProcessId, "SIGTERM");

        return true;
      }
    }
  } catch {
    // No PID file, or the process is gone already.
  }

  return false;
};

export const stopStockServer = (): void => {
  stopStockServerFromPidFile(stockServerPidFile);
  rmSync(stockServerPidFile, { force: true });
};
