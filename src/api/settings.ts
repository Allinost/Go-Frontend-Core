import { getResponse, putResponse } from './request'
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
