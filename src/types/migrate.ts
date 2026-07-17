export interface ColumnSchema {
  name: string
  type: string
  nullable: boolean
}

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
}

export interface BackupMeta {
  version: string
  name?: string
  path?: string
  created_at: string
  tables: string[]
  row_count: number
  file_size: number
  checksum: string
  compress_algo: string
}

export interface SchemaMigration {
  version: string
  name: string
  applied_at: string | null
  checksum: string
}

export interface MigrateResult {
  table_count: number
  row_count: number
  errors: string[]
}

export interface MigrateApplyResult {
  applied: number
  files: string[]
}

export interface DumpRequest {
  tables: string[]
  format: 'json' | 'sql' | 'csv'
  schema_only: boolean
}

export interface CreateBackupRequest {
  tables: string[]
  compress_algo: string
  encrypt_key?: string
}

export interface BackupRestoreRequest {
  path: string
  password?: string
}

export interface CreateMigrationRequest {
  name: string
}
