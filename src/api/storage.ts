import { getResponse, postResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface FileItem {
  name: string
  path: string
  size: number
  content_type?: string
  last_modified: string
  etag?: string
}

export interface StorageBackend {
  name: string
  type: string
  enabled: boolean
  endpoint: string
  bucket: string
}

export function listStorageBackends(): Promise<ApiResponse<StorageBackend[]>> {
  return getResponse('/storage/backends')
}

export function listFiles(backend: string, prefix?: string): Promise<ApiResponse<FileItem[]>> {
  return getResponse('/storage/files', { backend, prefix })
}

export function uploadFile(backend: string, file: File, path: string): Promise<ApiResponse<FileItem>> {
  const form = new FormData()
  form.append('file', file)
  form.append('path', path)
  return postResponse(`/storage/files?backend=${backend}&path=${path}`, form)
}

export function deleteFile(backend: string, path: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/storage/files?backend=${backend}&path=${path}`)
}

export function getSignedUrl(backend: string, path: string): Promise<ApiResponse<{ url: string }>> {
  return getResponse('/storage/signed-url', { backend, path })
}
