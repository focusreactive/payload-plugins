import * as migration_20260525_110727_init from "./20260525_110727_init";
import * as migration_20260604_101934_create_ab_experiments from "./20260604_101934_create_ab_experiments";

export const migrations = [
  {
    up: migration_20260525_110727_init.up,
    down: migration_20260525_110727_init.down,
    name: "20260525_110727_init",
  },
  {
    up: migration_20260604_101934_create_ab_experiments.up,
    down: migration_20260604_101934_create_ab_experiments.down,
    name: "20260604_101934_create_ab_experiments",
  },
];
