import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse, RoleModel, Permission } from '@/types/api'

export function listRoles(): Promise<ApiResponse<RoleModel[]>> {
  return getResponse('/auth/roles')
}

export function createRole(name: string): Promise<ApiResponse<void>> {
  return postResponse('/auth/roles', { name })
}

export function updateRole(name: string, newName: string): Promise<ApiResponse<void>> {
  return putResponse(`/auth/roles/${encodeURIComponent(name)}`, { name: newName })
}

export function deleteRole(name: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/auth/roles/${encodeURIComponent(name)}`)
}

export function getRolePermissions(name: string): Promise<ApiResponse<Permission[]>> {
  return getResponse(`/auth/roles/${encodeURIComponent(name)}/permissions`)
}

export function listPermissions(): Promise<ApiResponse<Permission[]>> {
  return getResponse('/auth/permissions')
}

export function createPermission(data: { name: string; resource: string; action: string }): Promise<ApiResponse<void>> {
  return postResponse('/auth/permissions', data)
}

export function getPermission(id: number): Promise<ApiResponse<Permission>> {
  return getResponse(`/auth/permissions/${id}`)
}

export function updatePermission(id: number, data: { name: string; resource: string; action: string }): Promise<ApiResponse<void>> {
  return putResponse(`/auth/permissions/${id}`, data)
}

export function deletePermission(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/auth/permissions/${id}`)
}

export function assignRole(userId: number, role: string): Promise<ApiResponse<void>> {
  return postResponse('/auth/roles/assign', { user_id: userId, role })
}
