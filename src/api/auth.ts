import { postResponse, getResponse, putResponse, deleteResponse } from './request'
import type {
  ApiResponse,
  TokenPair,
  UserInfo,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
  RoleAssignRequest,
  PaginatedData,
} from '@/types/api'

export function login(data: LoginRequest): Promise<ApiResponse<TokenPair>> {
  return postResponse('/auth/login', data)
}

export function register(data: RegisterRequest): Promise<ApiResponse<TokenPair>> {
  return postResponse('/auth/register', data)
}

export function refreshToken(refreshToken: string): Promise<ApiResponse<TokenPair>> {
  return postResponse('/auth/refresh', { refresh_token: refreshToken })
}

export function getCurrentUser(): Promise<ApiResponse<UserInfo>> {
  return getResponse('/auth/me')
}

export function logout(): Promise<ApiResponse<void>> {
  return postResponse('/auth/logout')
}

export function updateProfile(data: UpdateUserRequest): Promise<ApiResponse<UserInfo>> {
  return putResponse('/auth/profile', data)
}

export function changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
  return putResponse('/auth/password', { old_password: oldPassword, new_password: newPassword })
}

export function listUsers(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<ApiResponse<PaginatedData<UserInfo>>> {
  return getResponse('/auth/users', params)
}

export function getUser(id: number): Promise<ApiResponse<UserInfo>> {
  return getResponse(`/auth/users/${id}`)
}

export function updateUser(id: number, data: UpdateUserRequest): Promise<ApiResponse<UserInfo>> {
  return putResponse(`/auth/users/${id}`, data)
}

export function deleteUser(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/auth/users/${id}`)
}

export function assignRole(data: RoleAssignRequest): Promise<ApiResponse<void>> {
  return postResponse('/auth/roles/assign', data)
}
