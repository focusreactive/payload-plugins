import * as migration_20260525_110727_init from "./20260525_110727_init";

export const migrations = [
  {
    up: migration_20260525_110727_init.up,
    down: migration_20260525_110727_init.down,
    name: "20260525_110727_init",
  },
];
