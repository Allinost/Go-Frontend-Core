import { getResponse, postResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface RoleInfo {
  name: string
  description?: string
  is_system?: boolean
  user_count?: number
}

export interface PermissionInfo {
  id?: number
  name: string
  resource: string
  action: string
  description?: string
}

export function assignRole(userId: number, role: string): Promise<ApiResponse<{ message: string }>> {
  return postResponse('/auth/roles/assign', { user_id: userId, role })
}

export function listRoles(): Promise<ApiResponse<RoleInfo[]>> {
  return getResponse('/auth/roles')
}

export function listPermissions(): Promise<ApiResponse<PermissionInfo[]>> {
  return getResponse('/auth/permissions')
}
