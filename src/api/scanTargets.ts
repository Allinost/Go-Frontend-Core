import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface ScanTarget {
  id?: number
  storage_name: string
  table_name: string
  column_name: string
  module_name: string
  reference_type: string
  enabled: boolean
  description?: string
  created_at?: string
  updated_at?: string
}

export interface ScanTargetListData {
  targets: ScanTarget[]
}

export function listScanTargets(params?: {
  storage_name?: string
  enabled_only?: boolean
}): Promise<ApiResponse<ScanTargetListData>> {
  return getResponse('/ops/scan-targets', params)
}

export function createScanTarget(target: Omit<ScanTarget, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ScanTarget>> {
  return postResponse('/ops/scan-targets', target)
}

export function updateScanTarget(id: number, target: Partial<ScanTarget>): Promise<ApiResponse<ScanTarget>> {
  return putResponse(`/ops/scan-targets/${id}`, target)
}

export function deleteScanTarget(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/ops/scan-targets/${id}`)
}
