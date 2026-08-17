import * as migration_20260805_190027_initial from './20260805_190027_initial';

export const migrations = [
  {
    up: migration_20260805_190027_initial.up,
    down: migration_20260805_190027_initial.down,
    name: '20260805_190027_initial'
  },
];
