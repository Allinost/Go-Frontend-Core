// 项目开发管理（developmentManager）类型定义

export interface PaginatedResp<T> {
  items: T[]
  has_more: boolean
  total: number
}

export interface ProjectStats {
  projects_total: number
  projects_deleted: number
  projects_by_type: Record<string, number>
  projects_by_status: Record<string, number>
  relations_active: number
  assets_total: number
}

export interface Project {
  id: number
  project_key: string
  name: string
  type: string
  description: string
  repo_url: string
  repo_path: string
  default_branch: string
  tech_stack?: string[]
  status: string
  deleted: boolean
  deleted_at?: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface ProjectRelation {
  id: number
  from_project_id: number
  to_project_id: number
  relation_type: string
  note: string
  deleted: boolean
  from_project_key?: string
  from_project_name?: string
  to_project_key?: string
  to_project_name?: string
  created_at: string
}

export interface ProjectAsset {
  id: number
  project_id: number
  category: string
  title: string
  uri: string
  format: string
  version: string
  size: number
  checksum: string
  note: string
  deleted: boolean
  created_at: string
  updated_at: string
}

export interface Container {
  id: number
  project_id: number
  container_name: string
  image: string
  compose_ref: string
  replicas: number
  network_mode: string
  env_notes?: Record<string, string>
  status_note: string
  deleted: boolean
  created_at: string
  updated_at: string
}

export interface ResourceAlloc {
  id: number
  container_id: number
  cpu_limit: string
  cpu_shares: number
  mem_limit: string
  mem_reservation: string
  gpu_note: string
  storage_quota: string
  notes: string
}

export interface VolumeMapping {
  id: number
  container_id: number
  host_path: string
  container_path: string
  mode: string
  purpose: string
  in_backup: boolean
  deleted: boolean
}

export interface AccessPoint {
  id: number
  project_id: number
  container_id?: number | null
  listen_port: number
  host_port?: number | null
  protocol: string
  purpose: string
  exposure: string
  proxy_type: string
  domain: string
  upstream_url: string
  tls: boolean
  network_zone: string
  url?: string | null
  reachable: boolean
  notes: string
  whitelist_id?: number | null
  whitelist_name?: string
  deleted: boolean
}

export interface Whitelist {
  id: number
  project_id: number
  name: string
  note: string
  member_count: number
  deleted: boolean
}

export interface WhitelistMember {
  id: number
  whitelist_id: number
  container_id: number
  container_name?: string
  note: string
  created_at: string
}

export interface Backup {
  id: number
  project_id: number
  container_id?: number | null
  volume_id?: number | null
  backup_type: string
  strategy_cron: string
  destination: string
  retention_days: number
  last_run_at?: string | null
  last_status: string
  last_error: string
  restore_note: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface DBTable {
  id: number
  project_id: number
  db_type: string
  table_schema: string
  table_name: string
  purpose: string
  status: string
  module_name: string
  created_note: string
  column_count: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface DBColumn {
  id: number
  table_id: number
  column_name: string
  data_type: string
  nullable: boolean
  default_value?: string | null
  meaning: string
  example: string
  is_pk: boolean
  is_index: boolean
  note: string
}

export interface Requirement {
  id: number
  project_id: number
  code: string
  title: string
  content: string
  type: string
  priority: string
  status: string
  source: string
  owner: string
  latest_version: number
  deleted: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface RequirementVersion {
  id: number
  requirement_id: number
  version_no: number
  title: string
  content: string
  status: string
  change_note: string
  operator: string
  created_at: string
}

export interface Generation {
  id: number
  requirement_id: number
  project_id: number
  kind: string
  engine: string
  engine_used: string
  auto_commit: boolean
  committed: boolean
  branch: string
  commit_hash: string
  status: string
  input_snapshot?: any
  output_ref: string
  files?: string[]
  error: string
  operator: string
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at: string
}

export interface ScanImportResp {
  table_id: number
  scanned: number
  created: number
  updated: number
}

export interface ExpandAssetResp {
  asset_id?: number
  scanned: number
  created: number
  skipped: number
  failed: number
}
