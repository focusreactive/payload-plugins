import * as migration_20260316_220744_init from './20260316_220744_init';

export const migrations = [
  {
    up: migration_20260316_220744_init.up,
    down: migration_20260316_220744_init.down,
    name: '20260316_220744_init'
  },
];
