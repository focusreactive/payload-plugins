import * as migration_20260316_220744_init from './20260316_220744_init'
import * as migration_20260326_120907_content_releases from './20260326_120907_content_releases'
import * as migration_20260420_140729_create_preset_per_block_tables from './20260420_140729_create_preset_per_block_tables'
import * as migration_20260422_214318_add_rollback_skipped_column_to_releases from './20260422_214318_add_rollback_skipped_column_to_releases'
import * as migration_20260508_140239_align_schema_and_localize from './20260508_140239_align_schema_and_localize'
import * as migration_20260512_104342_localize_block_fields from './20260512_104342_localize_block_fields'

export const migrations = [
  {
    up: migration_20260316_220744_init.up,
    down: migration_20260316_220744_init.down,
    name: '20260316_220744_init',
  },
  {
    up: migration_20260326_120907_content_releases.up,
    down: migration_20260326_120907_content_releases.down,
    name: '20260326_120907_content_releases',
  },
  {
    up: migration_20260420_140729_create_preset_per_block_tables.up,
    down: migration_20260420_140729_create_preset_per_block_tables.down,
    name: '20260420_140729_create_preset_per_block_tables',
  },
  {
    up: migration_20260422_214318_add_rollback_skipped_column_to_releases.up,
    down: migration_20260422_214318_add_rollback_skipped_column_to_releases.down,
    name: '20260422_214318_add_rollback_skipped_column_to_releases',
  },
  {
    up: migration_20260508_140239_align_schema_and_localize.up,
    down: migration_20260508_140239_align_schema_and_localize.down,
    name: '20260508_140239_align_schema_and_localize',
  },
  {
    up: migration_20260512_104342_localize_block_fields.up,
    down: migration_20260512_104342_localize_block_fields.down,
    name: '20260512_104342_localize_block_fields',
  },
]
