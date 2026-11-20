import { getResponse, postResponse, putResponse, deleteResponse } from './request'

export interface Maintenance {
  id: number
  mode: string
  status: string
  source_node: string
  target_node: string
  switched_to_l2: boolean
  sync_confirmed: boolean
  sync_back_confirmed: boolean
  note: string
  started_by: string
  started_at: string
  ended_by: string
  ended_at?: string
  end_note: string
}

export interface MaintenanceStatus {
  active: Maintenance | null
  node: string
  modes: string[]
  warning?: string
}

export interface Host {
  id: number
  name: string
  role: string
  environment: string
  address: string
  ssh_port: number
  username: string
  auth_type: string
  credential_hint: string
  has_credential: boolean
  os: string
  tags: string[]
  notes: string
  status: string
  last_checked_at?: string
  last_error: string
  created_at: string
  updated_at: string
}

export interface HostTestResult {
  online: boolean
  status: string
  error?: string
  duration_ms: number
  remote_addr?: string
  server_info?: string
}

export interface HostStatusResult {
  online: boolean
  status: string
  error?: string
  uptime?: string
  disk?: string
  memory?: string
  collected_at: string
}

const BASE = 'ops'

export function getMaintenanceStatus() {
  return getResponse<MaintenanceStatus>(`${BASE}/maintenance`)
}

export function startMaintenance(data: Record<string, any>) {
  return postResponse<Maintenance>(`${BASE}/maintenance/start`, data)
}

export function endMaintenance(data: Record<string, any>) {
  return postResponse<Maintenance>(`${BASE}/maintenance/end`, data)
}

export function listMaintenanceHistory(limit = 50) {
  return getResponse<{ items: Maintenance[] }>(`${BASE}/maintenance/history`, { limit })
}

export function listHosts(params?: Record<string, any>) {
  return getResponse<{ items: Host[]; has_more: boolean; total: number }>(`${BASE}/hosts`, params)
}

export function getHost(id: number | string) {
  return getResponse<Host>(`${BASE}/hosts/${id}`)
}

export function createHost(data: Record<string, any>) {
  return postResponse<Host>(`${BASE}/hosts`, data)
}

export function updateHost(id: number | string, data: Record<string, any>) {
  return putResponse<Host>(`${BASE}/hosts/${id}`, data)
}

export function deleteHost(id: number | string) {
  return deleteResponse<any>(`${BASE}/hosts/${id}`)
}

export function testHost(id: number | string) {
  return postResponse<HostTestResult>(`${BASE}/hosts/${id}/test`)
}

export function getHostStatus(id: number | string) {
  return getResponse<HostStatusResult>(`${BASE}/hosts/${id}/status`)
}
