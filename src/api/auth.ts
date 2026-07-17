import { postResponse, getResponse, putResponse, deleteResponse } from './request'
import type {
  ApiResponse,
  TokenPair,
  UserInfo,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
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

export async function listUsers(params?: {
  page?: number
  page_size?: number
  search?: string
}): Promise<ApiResponse<PaginatedData<UserInfo>>> {
  const res = await getResponse<Record<string, any>>('/auth/users', params)
  const raw = res.data
  const items: UserInfo[] = raw.list || raw.items || raw.data || raw.records || []
  return {
    ...res,
    data: {
      data: items,
      total: raw.total ?? items.length,
      page: raw.page ?? raw.page_num ?? 1,
      size: raw.size ?? raw.page_size ?? items.length,
    },
  }
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


