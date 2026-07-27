import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'
import type { WebhookConfig, WebhookDeliveryLog, SendReq, SendResult, StatsResp, PaginatedResp } from '@/types/webhook'

export function listConfigs(params?: {
  page?: number
  page_size?: number
  type?: string
  status?: string
  source?: string
  keyword?: string
}): Promise<ApiResponse<PaginatedResp<WebhookConfig>>> {
  return getResponse('/webhook/configs', params)
}

export function createConfig(data: Partial<WebhookConfig>): Promise<ApiResponse<WebhookConfig>> {
  return postResponse('/webhook/configs', data)
}

export function getConfig(id: string): Promise<ApiResponse<WebhookConfig>> {
  return getResponse(`/webhook/configs/${id}`)
}

export function updateConfig(id: string, data: Partial<WebhookConfig>): Promise<ApiResponse<WebhookConfig>> {
  return putResponse(`/webhook/configs/${id}`, data)
}

export function deleteConfig(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/webhook/configs/${id}`)
}

export function updateConfigStatus(id: string, status: string): Promise<ApiResponse<WebhookConfig>> {
  return postResponse(`/webhook/configs/${id}/status`, { status })
}

export function testSendConfig(id: string): Promise<ApiResponse<any>> {
  return postResponse(`/webhook/configs/${id}/test`)
}

export function sendWebhook(data: SendReq): Promise<ApiResponse<SendResult>> {
  return postResponse('/webhook/send', data)
}

export function listDeliveryLogs(params?: {
  page?: number
  page_size?: number
  webhook_id?: string
  status?: string
  source?: string
}): Promise<ApiResponse<PaginatedResp<WebhookDeliveryLog>>> {
  return getResponse('/webhook/delivery-logs', params)
}

export function deleteDeliveryLog(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/webhook/delivery-logs/${id}`)
}

export function batchDeleteDeliveryLogs(ids: string[]): Promise<ApiResponse<void>> {
  return postResponse('/webhook/delivery-logs/batch-delete', { ids })
}

export function getStats(): Promise<ApiResponse<StatsResp>> {
  return getResponse('/webhook/stats')
}

export function getConfigStats(id: string): Promise<ApiResponse<any>> {
  return getResponse(`/webhook/configs/${id}/stats`)
}
