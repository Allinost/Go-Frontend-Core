import { getResponse, postResponse, deleteResponse } from './request'
import { getAccessToken } from '@/utils/auth'
import type {
  ApiResponse,
  BackupMeta,
  SchemaMigration,
  MigrateResult,
  MigrateApplyResult,
  TableSchema,
  SchemaDumpResult,
  DumpRequest,
  CreateBackupRequest,
  BackupRestoreRequest,
  TransferRequest,
  TransferResult,
} from '@/types'

export function getTables(): Promise<ApiResponse<{ tables: string[] }>> {
  return getResponse('/migrate/tables')
}

export function getTableSchema(name: string): Promise<ApiResponse<TableSchema>> {
  return getResponse(`/migrate/tables/${name}/schema`)
}

export async function downloadDump(data: DumpRequest): Promise<void> {
  const token = getAccessToken()
  const res = await fetch('/api/v1/migrate/dump', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || '导出失败')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  let filename = `dump.${data.format}`
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]*)["']?/)
    if (match) filename = match[1]
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function restoreUpload(formData: FormData): Promise<MigrateResult> {
  const token = getAccessToken()
  const res = await fetch('/api/v1/migrate/restore', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })
  const json: ApiResponse<MigrateResult> = await res.json()
  if (json.code !== 0) throw new Error(json.message || '恢复失败')
  return json.data
}

export function createBackup(data: CreateBackupRequest): Promise<ApiResponse<BackupMeta>> {
  return postResponse('/migrate/backup', data)
}

export function restoreBackup(data: BackupRestoreRequest): Promise<ApiResponse<MigrateResult>> {
  return postResponse('/migrate/backup/restore', data)
}

export function listBackups(): Promise<ApiResponse<{ backups: BackupMeta[] }>> {
  return getResponse('/migrate/backups')
}

export function deleteBackup(name: string): Promise<ApiResponse<{ message: string }>> {
  return deleteResponse(`/migrate/backups/${name}`)
}

export function listSchemaMigrations(): Promise<ApiResponse<SchemaMigration[]>> {
  return getResponse('/migrate/schema/migrations')
}

export function applyMigrations(): Promise<ApiResponse<MigrateApplyResult>> {
  return postResponse('/migrate/schema/migrate')
}

export function createMigration(name: string): Promise<ApiResponse<{ file: string }>> {
  return postResponse('/migrate/schema/create', { name })
}

export function schemaDump(): Promise<ApiResponse<SchemaDumpResult>> {
  return getResponse('/migrate/schema/dump')
}

export function transferData(data: TransferRequest): Promise<ApiResponse<TransferResult>> {
  return postResponse('/migrate/transfer', data)
}
