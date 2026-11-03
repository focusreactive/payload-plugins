/**
 * The seed writes synthetic users with a known password and a fixed tree, so it must never reach a
 * real database: it refuses a production environment, and any `DATABASE_URI` that is not a local
 * SQLite file (the dev app's own database is `file:` too).
 */
export const assertSeedAllowed = (
  environment: Record<string, string | undefined> = process.env
): void => {
  if (environment.NODE_ENV === "production") {
    throw new Error("The dev seed does not run with NODE_ENV=production");
  }
  const databaseUri = environment.DATABASE_URI;
  if (databaseUri && !databaseUri.startsWith("file:")) {
    throw new Error(
      "The dev seed only runs against a local SQLite file: DATABASE_URI is set to another kind of database"
    );
  }
};
