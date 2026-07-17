import { getResponse, postResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface ReferenceItem {
  id?: number
  object_key: string
  module_name: string
  table_name: string
  record_id: string
  column_name: string
  reference_type: string
  created_at?: string
}

export interface ReferenceStats {
  total_references: number
  total_files: number
  by_module: Record<string, number>
  by_storage: Record<string, number>
}

export interface ReferenceListData {
  records: ReferenceItem[]
  offset: number
  limit: number
  total: number
}

export function registerReferences(references: Omit<ReferenceItem, 'id' | 'created_at'>[]): Promise<ApiResponse<void>> {
  return postResponse('/ops/references', { references })
}

export function queryReferences(params: {
  module_name?: string
  object_key?: string
  table_name?: string
  record_id?: string
  reference_type?: string
  offset?: number
  limit?: number
}): Promise<ApiResponse<ReferenceListData>> {
  return getResponse('/ops/references', params)
}

export function getReferenceStats(): Promise<ApiResponse<ReferenceStats>> {
  return getResponse('/ops/references/stats')
}

export function syncReferences(targets?: string): Promise<ApiResponse<void>> {
  const body: Record<string, any> = {}
  if (targets) body.targets = targets
  return postResponse('/ops/references/sync', body)
}
