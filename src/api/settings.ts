import { getResponse, postResponse, putResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface AppSettings {
  public_base_url: string
  frontend_title: string
  frontend_api_base_url: string
  browser_url: string
  n8n_url: string
  openclaw_url: string
  langbot_url: string
}

export interface SettingsStatus {
  name: string
  status: 'ok' | 'error' | string
}

export interface SettingsMeta {
  version: string
  mode: string
  server_name: string
  settings_file: string
  persisted: boolean
  chrome_remote_url: string
  read_only_keys: string[]
}

export interface SettingsView {
  settings: AppSettings
  status: SettingsStatus[]
  meta: SettingsMeta
}

export function getAppSettings(): Promise<ApiResponse<SettingsView>> {
  return getResponse<SettingsView>('/settings')
}

export function updateAppSettings(data: AppSettings): Promise<ApiResponse<SettingsView>> {
  return putResponse<SettingsView>('/settings', data)
}

// ---------- 配置中心 ----------

export type ConfigValueType = 'string' | 'int' | 'bool' | 'duration' | 'json' | 'secret'

export interface ConfigSpec {
  key: string
  module: string
  type: ConfigValueType
  default: any
  enum?: string[]
  min?: number
  max?: number
  sensitive: boolean
  reloadable: boolean
  env_locked: boolean
  unused?: boolean
  group: string
  description: string
}

export interface ConfigValuesResp {
  values: Record<string, any>
  degraded?: string
}

export interface ConfigHistoryEntry {
  key: string
  old_value?: any
  new_value?: any
  version: number
  operator: string
  note: string
  created_at: string
}

export function getConfigSchema(): Promise<ApiResponse<{ specs: ConfigSpec[] }>> {
  return getResponse<{ specs: ConfigSpec[] }>('/settings/config/schema')
}

export function getConfigValues(): Promise<ApiResponse<ConfigValuesResp>> {
  return getResponse<ConfigValuesResp>('/settings/config')
}

export function updateConfigValues(values: Record<string, any>, note = '') {
  return putResponse<ConfigValuesResp>('/settings/config', { values, note })
}

export function validateConfigValues(values: Record<string, any>) {
  return postResponse<{ values: Record<string, any> }>('/settings/config/validate', { values })
}

export function resetConfigValues(keys: string[], note = '') {
  return postResponse<ConfigValuesResp>('/settings/config/reset', { keys, note })
}

export function getConfigHistory(key?: string, limit = 50) {
  return getResponse<{ items: ConfigHistoryEntry[] }>('/settings/config/history', { key, limit })
}
