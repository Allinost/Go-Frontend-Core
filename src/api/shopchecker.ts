import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'
import type { Product, PriceRecord, NotificationLog, DashboardResp, PaginatedResp } from '@/types/shopchecker'

export function listProducts(params?: {
  page?: number
  page_size?: number
  platform?: string
  keyword?: string
  enabled?: boolean
}): Promise<ApiResponse<PaginatedResp<Product>>> {
  return getResponse('/shopchecker/products', params)
}

export function createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
  return postResponse('/shopchecker/products', data)
}

export function getProduct(id: string): Promise<ApiResponse<Product>> {
  return getResponse(`/shopchecker/products/${id}`)
}

export function updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  return putResponse(`/shopchecker/products/${id}`, data)
}

export function deleteProduct(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/shopchecker/products/${id}`)
}

export function manualCheck(id: string): Promise<ApiResponse<any>> {
  return postResponse(`/shopchecker/products/${id}/check`)
}

export function listPriceRecords(id: string, params?: {
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedResp<PriceRecord>>> {
  return getResponse(`/shopchecker/products/${id}/price-records`, params)
}

export function listNotificationLogs(id: string, params?: {
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedResp<NotificationLog>>> {
  return getResponse(`/shopchecker/products/${id}/notification-logs`, params)
}

export function getDashboard(): Promise<ApiResponse<DashboardResp>> {
  return getResponse('/shopchecker/dashboard')
}