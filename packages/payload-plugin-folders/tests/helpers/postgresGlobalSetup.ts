import { startPostgres } from "./postgres.js";
import type { RunningPostgres } from "./postgres.js";

export const postgresConnectionEnvironmentKey = "FOLDERS_TEST_POSTGRES_URL";

let runningPostgres: RunningPostgres | undefined;

export const setup = async () => {
  if (process.env.TEST_DB !== "postgres") {
    return;
  }

  runningPostgres = await startPostgres();
  // The test workers are forked after this runs, so they inherit the variable.
  process.env[postgresConnectionEnvironmentKey] = runningPostgres.connectionString;
};

export const teardown = async () => {
  await runningPostgres?.stop();
  runningPostgres = undefined;
};
