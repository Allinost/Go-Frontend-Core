import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'
import type {
  Login3rdPlatform,
  Login3rdAccount,
  CreateAccountReq,
  UpdateAccountReq,
  RemoteLoginResp,
  RemoteSessionStatus,
  AccountStatus,
  PaginatedAccounts,
  SchedulerTask,
  SchedulerTaskLog,
  SchedulerHandler,
  VerifySessionResp,
} from '@/types/login3rd'

export function listPlatforms(): Promise<ApiResponse<Login3rdPlatform[]>> {
  return getResponse('/login3rd/platforms')
}

export function listAccounts(params?: {
  page?: number
  page_size?: number
  platform_id?: string
}): Promise<ApiResponse<PaginatedAccounts>> {
  return getResponse('/login3rd/accounts', params)
}

export function getAccount(id: string): Promise<ApiResponse<Login3rdAccount>> {
  return getResponse(`/login3rd/accounts/${id}`)
}

export function createAccount(data: CreateAccountReq): Promise<ApiResponse<Login3rdAccount>> {
  return postResponse('/login3rd/accounts', data)
}

export function updateAccount(id: string, data: UpdateAccountReq): Promise<ApiResponse<Login3rdAccount>> {
  return putResponse(`/login3rd/accounts/${id}`, data)
}

export function deleteAccount(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/login3rd/accounts/${id}`)
}

export function autoLogin(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/login3rd/accounts/${id}/login`)
}

export function remoteLogin(id: string): Promise<ApiResponse<RemoteLoginResp>> {
  return postResponse(`/login3rd/accounts/${id}/remote-login`)
}

export function getRemoteSessionStatus(token: string): Promise<ApiResponse<RemoteSessionStatus>> {
  return getResponse(`/login3rd/remote/session/${token}/status`)
}

export function getAccountStatus(id: string): Promise<ApiResponse<AccountStatus>> {
  return getResponse(`/login3rd/accounts/${id}/status`)
}

export function refreshSession(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/login3rd/accounts/${id}/refresh`)
}

export function verifySession(id: string): Promise<ApiResponse<VerifySessionResp>> {
  return postResponse(`/login3rd/accounts/${id}/verify`)
}

export function logoutSession(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/login3rd/accounts/${id}/logout`)
}

export function listSchedulerTasks(): Promise<ApiResponse<SchedulerTask[]>> {
  return getResponse('/scheduler/tasks')
}

export function getSchedulerTask(id: string): Promise<ApiResponse<SchedulerTask>> {
  return getResponse(`/scheduler/tasks/${id}`)
}

export function runSchedulerTask(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/scheduler/tasks/${id}/run`)
}

export function pauseSchedulerTask(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/scheduler/tasks/${id}/pause`)
}

export function resumeSchedulerTask(id: string): Promise<ApiResponse<void>> {
  return postResponse(`/scheduler/tasks/${id}/resume`)
}

export function getSchedulerTaskLogs(id: string): Promise<ApiResponse<SchedulerTaskLog[]>> {
  return getResponse(`/scheduler/tasks/${id}/logs`)
}

export function listSchedulerHandlers(): Promise<ApiResponse<SchedulerHandler[]>> {
  return getResponse('/scheduler/handlers')
}