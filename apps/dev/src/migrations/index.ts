import * as migration_20260316_220744_init from './20260316_220744_init';
import * as migration_20260420_140729_create_preset_per_block_tables from './20260420_140729_create_preset_per_block_tables';

export const migrations = [
  {
    up: migration_20260316_220744_init.up,
    down: migration_20260316_220744_init.down,
    name: '20260316_220744_init',
  },
  {
    up: migration_20260420_140729_create_preset_per_block_tables.up,
    down: migration_20260420_140729_create_preset_per_block_tables.down,
    name: '20260420_140729_create_preset_per_block_tables'
  }
];
