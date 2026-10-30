import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface ServiceItem {
  _id: string
  name: string
  types: string[]
  protocol: string
  address: string
  intranet_port: number | null
  easytier_port: number | null
  account?: string
  password_hint?: string
  remark?: string
  project_id?: number | null
  container_id?: number | null
  access_point_id?: number | null
  project_key?: string
  project_name?: string
  container_name?: string
  created_at: string
  updated_at: string
}

export interface ServiceType {
  _id: string
  name: string
  remark?: string
  created_at: string
  updated_at: string
}

export interface PaginatedItems<T> {
  items: T[]
  has_more: boolean
  total: number
}

export interface ListServicesParams {
  page?: number
  page_size?: number
  keyword?: string
  type?: string
  project_id?: number
  sort_by?: 'name' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface CreateServiceRequest {
  name: string
  types: string[]
  protocol?: string
  address?: string
  intranet_port?: number | null
  easytier_port?: number | null
  account?: string
  password_hint?: string
  remark?: string
  project_id?: number | null
  container_id?: number | null
  access_point_id?: number | null
}

export interface UpdateServiceRequest {
  name?: string
  types?: string[]
  protocol?: string
  address?: string
  intranet_port?: number | null
  clear_intranet_port?: boolean
  easytier_port?: number | null
  clear_easytier_port?: boolean
  account?: string
  password_hint?: string
  remark?: string
  project_id?: number | null
  clear_project?: boolean
  container_id?: number | null
  clear_container?: boolean
  access_point_id?: number | null
  clear_access_point?: boolean
}

export interface ImportFromProjectsRequest {
  project_ids?: number[]
  types?: string[]
  update_existing?: boolean
}

export interface ImportFromProjectsResponse {
  projects: number
  access_points: number
  created: number
  updated: number
  skipped: number
}

export interface CreateTypeRequest {
  name: string
  remark?: string
}

export interface UpdateTypeRequest {
  name?: string
  remark?: string
}

export function listServices(
  params?: ListServicesParams,
): Promise<ApiResponse<PaginatedItems<ServiceItem>>> {
  return getResponse('/servicenav/services', params)
}

export function createService(data: CreateServiceRequest): Promise<ApiResponse<ServiceItem>> {
  return postResponse('/servicenav/services', data)
}

export function getService(id: string): Promise<ApiResponse<ServiceItem>> {
  return getResponse(`/servicenav/services/${encodeURIComponent(id)}`)
}

export function updateService(id: string, data: UpdateServiceRequest): Promise<ApiResponse<ServiceItem>> {
  return putResponse(`/servicenav/services/${encodeURIComponent(id)}`, data)
}

export function deleteService(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/servicenav/services/${encodeURIComponent(id)}`)
}

export function importFromProjects(
  data: ImportFromProjectsRequest,
): Promise<ApiResponse<ImportFromProjectsResponse>> {
  return postResponse('/servicenav/import', data)
}

export function listTypes(): Promise<ApiResponse<ServiceType[]>> {
  return getResponse('/servicenav/types')
}

export function createType(data: CreateTypeRequest): Promise<ApiResponse<ServiceType>> {
  return postResponse('/servicenav/types', data)
}

export function updateType(id: string, data: UpdateTypeRequest): Promise<ApiResponse<ServiceType>> {
  return putResponse(`/servicenav/types/${encodeURIComponent(id)}`, data)
}

export function deleteType(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/servicenav/types/${encodeURIComponent(id)}`)
}