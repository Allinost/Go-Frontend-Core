import { getResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface HealthCheck {
  name: string
  status: 'up' | 'down' | 'degraded' | string
  latency_ms: number
  error?: string
}

export interface HealthResp {
  status: string
  version: string
  uptime: string
  checks: HealthCheck[]
}

export interface SystemInfo {
  name: string
  version: string
  mode: string
  uptime: string
  start_time: string
  go_version: string
  go_os: string
  go_arch: string
  goroutines: number
  modules: string[]
  config_watch: boolean
}

export interface ModuleInfo {
  name: string
}

export function getHealth(): Promise<ApiResponse<HealthResp>> {
  return getResponse<HealthResp>('/health/health')
}

export function getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
  return getResponse<SystemInfo>('/health/info')
}

export function getModules(): Promise<ApiResponse<{ count: number; modules: ModuleInfo[] }>> {
  return getResponse<{ count: number; modules: ModuleInfo[] }>('/health/modules')
}
