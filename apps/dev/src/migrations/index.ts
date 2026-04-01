import * as migration_20260316_220744_init from './20260316_220744_init';
import * as migration_20260326_120907_content_releases from './20260326_120907_content_releases';

export const migrations = [
  {
    up: migration_20260316_220744_init.up,
    down: migration_20260316_220744_init.down,
    name: '20260316_220744_init',
  },
  {
    up: migration_20260326_120907_content_releases.up,
    down: migration_20260326_120907_content_releases.down,
    name: '20260326_120907_content_releases'
  },
];
