import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const postgresPort = 54_329;

// Vitest runs about a dozen files at once and each holds one or two Payload instances with a pool
// of their own, so the default of 100 connections ran out ("too many clients already"). Test pools
// are capped at `testPoolMaxConnections` (getTestPayload.ts); this limit leaves room for every
// worker even when each one holds a few instances.
const clusterMaxConnections = 500;

const homebrewBinaryDirectory = "/opt/homebrew/opt/postgresql@17/bin";

// Every server this package starts records its PID here, so it can be stopped by that PID alone
// and never by process name, which would also match other sessions' processes.
const pidDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.run");
const postgresPidFile = path.join(pidDirectory, "postgres.pid");

export const missingPostgresMessage = "Set TEST_DATABASE_URL or install Postgres 17";

export type RunningPostgres = {
  connectionString: string;
  stop: () => Promise<void>;
};

const findBinaryDirectory = (): string | undefined => {
  const searchDirectories = [
    ...(process.env.PATH ?? "").split(path.delimiter),
    homebrewBinaryDirectory,
  ];

  return searchDirectories.find(
    (directory) =>
      directory !== "" &&
      existsSync(path.join(directory, "initdb")) &&
      existsSync(path.join(directory, "pg_ctl"))
  );
};

/**
 * Uses TEST_DATABASE_URL when set; otherwise starts a throwaway cluster from the local Postgres
 * binaries on port 54329. Fails loudly when neither exists, so a Postgres run is never skipped.
 */
export const startPostgres = async (): Promise<RunningPostgres> => {
  const existingUrl = process.env.TEST_DATABASE_URL;
  if (existingUrl) {
    return { connectionString: existingUrl, stop: () => Promise.resolve() };
  }

  const binaryDirectory = findBinaryDirectory();
  if (!binaryDirectory) {
    throw new Error(missingPostgresMessage);
  }

  const clusterDirectory = await mkdtemp(path.join(tmpdir(), "folders-postgres-"));
  const dataDirectory = path.join(clusterDirectory, "data");
  const socketDirectory = path.join(clusterDirectory, "socket");
  await mkdir(socketDirectory);

  const pgCtl = path.join(binaryDirectory, "pg_ctl");
  const removeCluster = () => rm(clusterDirectory, { force: true, recursive: true });

  try {
    await execFileAsync(path.join(binaryDirectory, "initdb"), [
      "-D",
      dataDirectory,
      "-U",
      "postgres",
      "--auth=trust",
      "--no-sync",
    ]);
    await execFileAsync(pgCtl, [
      "-D",
      dataDirectory,
      "-l",
      path.join(clusterDirectory, "postgres.log"),
      "-o",
      `-p ${postgresPort} -k ${socketDirectory} -c listen_addresses=127.0.0.1 -c fsync=off -c max_connections=${clusterMaxConnections}`,
      "-w",
      "start",
    ]);
  } catch (error) {
    await removeCluster();
    throw new Error(
      `Could not start Postgres on port ${postgresPort} (is another cluster using it?): ${String(error)}`,
      { cause: error }
    );
  }

  // The first line of postmaster.pid is the server's PID.
  const postmasterPidFile = await readFile(path.join(dataDirectory, "postmaster.pid"), "utf-8");
  await mkdir(pidDirectory, { recursive: true });
  await writeFile(postgresPidFile, `${postmasterPidFile.split("\n")[0]}\n`);

  return {
    connectionString: `postgres://postgres@127.0.0.1:${postgresPort}/postgres`,
    stop: async () => {
      try {
        await execFileAsync(pgCtl, ["-D", dataDirectory, "-m", "immediate", "-w", "stop"]);
      } finally {
        await rm(postgresPidFile, { force: true });
        await removeCluster();
      }
    },
  };
};
