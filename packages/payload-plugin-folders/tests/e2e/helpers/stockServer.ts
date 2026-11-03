import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

export const stockServerPort = 4079;
export const stockServerUrl = `http://localhost:${stockServerPort}`;
export const stockServerPidFile = ".run/next-dev-stock.pid";
const stockServerLogFile = ".run/next-dev-stock.log";

/** Whether anything accepts connections on the port, answering or not. */
const isPortInUse = (): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "localhost", port: stockServerPort });
    socket.setTimeout(3000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/** What stopping needs from the machine; tests replace it. */
export type StopDependencies = {
  /**
   * The command line of a process, or `null` when it is gone. A process that has exited and is
   * waiting to be collected counts as gone.
   */
  commandOf: (processId: number) => string | null;
  isPortInUse: () => Promise<boolean>;
  kill: (processId: number, signal: NodeJS.Signals) => void;
  /** Reports what stopping did, so a CI log shows it. */
  log: (message: string) => void;
  sleep: (milliseconds: number) => Promise<void>;
};

const defaultStopDependencies: StopDependencies = {
  commandOf: (processId) => {
    try {
      const command = execFileSync("ps", ["-o", "args=", "-p", String(processId)], {
        encoding: "utf-8",
      }).trim();
      // Linux prints a collected-later process as `[node] <defunct>`, macOS as `(node)`.
      if (command === "" || command.includes("<defunct>") || /^\(.*\)$/u.test(command)) {
        return null;
      }

      return command;
    } catch {
      // ps exits 1 when the process does not exist.
      return null;
    }
  },
  isPortInUse,
  kill: (processId, signal) => process.kill(processId, signal),
  log: (message) => console.log(`[stock server] ${message}`),
  sleep,
};

/**
 * Whether a command line is the one `startStockServer` spawns: the leader of the server's process
 * group keeps these arguments even after the server renames its own process.
 */
export const isStockServerCommand = (command: string): boolean =>
  /\bnext\b/u.test(command) &&
  /\bdev\b/u.test(command) &&
  command.includes(`--port ${stockServerPort}`);

const gracePeriodMs = 30_000;
const killPeriodMs = 10_000;
const pollMs = 250;

export type StopResult =
  /** No PID file, or the process it names is gone. */
  | "none"
  /** The PID names a live process that is not the stock server; nothing was signalled. */
  | "not-ours"
  /** Signalled and the port came free. */
  | "stopped"
  /** Needed SIGKILL, and the port came free. */
  | "killed"
  /** The port is still in use after SIGKILL. */
  | "stuck";

/**
 * Stops the stock-list server named by the PID file, and only that one, and returns when its port
 * is free. A PID file that outlived its server may name a process that now belongs to someone
 * else, so the group is signalled only while the saved PID still runs the command that
 * `startStockServer` spawned. Asks politely first, then with SIGKILL: a dev server that is slow to
 * exit would otherwise still hold the port when the next test wants it.
 */
export const stopStockServerFromPidFile = async (
  pidFile: string,
  dependencies: StopDependencies = defaultStopDependencies
): Promise<StopResult> => {
  let savedProcessId: number;
  try {
    savedProcessId = Number(readFileSync(pidFile, "utf-8").trim());
  } catch {
    return "none";
  }
  if (!Number.isInteger(savedProcessId) || savedProcessId <= 1) {
    return "none";
  }
  const command = dependencies.commandOf(savedProcessId);
  if (command === null) {
    return "none";
  }
  if (!isStockServerCommand(command)) {
    dependencies.log(
      `pid ${savedProcessId} is not the stock server (it runs "${command}"), left alone`
    );

    return "not-ours";
  }

  const isGone = async (): Promise<boolean> =>
    dependencies.commandOf(savedProcessId) === null && !(await dependencies.isPortInUse());
  const waitUntilGone = async (limitMs: number): Promise<boolean> => {
    for (let waited = 0; waited < limitMs; waited += pollMs) {
      if (await isGone()) {
        return true;
      }
      await dependencies.sleep(pollMs);
    }

    return isGone();
  };
  const signalGroup = (signal: NodeJS.Signals): void => {
    try {
      dependencies.kill(-savedProcessId, signal);
    } catch {
      // The group is gone already.
    }
  };

  signalGroup("SIGTERM");
  if (await waitUntilGone(gracePeriodMs)) {
    return "stopped";
  }
  dependencies.log(
    `still up ${gracePeriodMs / 1000} s after SIGTERM, sending SIGKILL to its group`
  );
  signalGroup("SIGKILL");
  if (await waitUntilGone(killPeriodMs)) {
    return "killed";
  }

  return "stuck";
};

export const stopStockServer = async (): Promise<StopResult> => {
  const result = await stopStockServerFromPidFile(stockServerPidFile);
  rmSync(stockServerPidFile, { force: true });

  return result;
};

const logTail = (): string => {
  try {
    return readFileSync(stockServerLogFile, "utf-8").split("\n").slice(-40).join("\n");
  } catch {
    return "(no log)";
  }
};

export type SecondServerOptions = {
  /** Its own build directory under `dev/`, so it never shares a cache with the main server. */
  distDirectory?: string;
  /** What makes it differ from the main server; the default is the stock list view. */
  env?: Record<string, string>;
};

/**
 * Starts a second dev server on the same database, by default with `admin.treeView: false`, in its
 * own build directory, and waits until the admin answers. It runs in its own process group; the
 * saved PID is how `stopStockServer` and the global teardown stop it, never a search by name.
 *
 * A server left by an earlier attempt of this suite (a test that timed out never reaches its
 * `finally`, and a retry runs in a new worker) is stopped first; anything else on the port is
 * refused, never signalled.
 */
export const startStockServer = async ({
  distDirectory = ".next-stock",
  env = { FOLDERS_TREE_VIEW: "false" },
}: SecondServerOptions = {}): Promise<void> => {
  const leftover = await stopStockServer();
  if (leftover !== "none") {
    console.log(`[stock server] a server of an earlier test was found: ${leftover}`);
  }
  if (await isPortInUse()) {
    throw new Error(
      `Something is already listening on port ${stockServerPort}, and it is not a server this suite started (earlier server: ${leftover})`
    );
  }
  const databaseDirectory = process.env.FOLDERS_E2E_DATABASE_DIRECTORY;
  if (!databaseDirectory) {
    throw new Error("FOLDERS_E2E_DATABASE_DIRECTORY is not set");
  }
  mkdirSync(".run", { recursive: true });
  const logDescriptor = openSync(stockServerLogFile, "w");
  const child = spawn(
    path.resolve("node_modules/.bin/next"),
    ["dev", "dev", "--port", String(stockServerPort)],
    {
      detached: true,
      env: {
        ...process.env,
        DATABASE_URI: `file:${path.join(databaseDirectory, "e2e.db")}`,
        ...env,
        NEXT_DIST_DIR: distDirectory,
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
  let exitCode: number | null | undefined;
  child.once("exit", (code) => {
    exitCode = code;
  });

  const startedAt = Date.now();
  const deadline = startedAt + 180_000;
  while (Date.now() < deadline) {
    if (exitCode !== undefined) {
      throw new Error(`The stock-list server exited with ${exitCode}:\n${logTail()}`);
    }
    try {
      const response = await fetch(`${stockServerUrl}/admin`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) {
        console.log(
          `[stock server] answered after ${Math.round((Date.now() - startedAt) / 1000)} s (${distDirectory})`
        );

        return;
      }
    } catch {
      // Not up yet.
    }
    await sleep(2000);
  }
  throw new Error(`The stock-list server did not answer on /admin within 3 minutes:\n${logTail()}`);
};
