import { getResponse, postResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface RustFSFile {
  name: string
  path: string
  size: number
  content_type: string
  last_modified: string
  etag: string
}

export interface FileListData {
  dirs: string[] | null
  files: RustFSFile[] | null
  offset: number
  limit: number
  total: number
}

export interface FileInfoData {
  name: string
  path: string
  size: number
  content_type: string
  last_modified: string
  etag: string
}

export interface SignedUrlData {
  url: string
  path: string
  expire: number
}

export interface ScanTarget {
  table: string
  column: string
  referenced_count: number
  scanned_rows: number
}

export interface ScanOrphanFile {
  name: string
  path: string
  size: number
  last_modified: string
}

export interface ScanResult {
  total_files: number
  total_size: number
  referenced_files: number
  orphan_files: number
  scan_targets: ScanTarget[]
  orphans: ScanOrphanFile[]
  all_referenced: string[]
}

export interface PrefixStat {
  prefix: string
  count: number
  size: number
}

export interface BucketStats {
  total_files: number
  total_size: number
  prefix_stats: PrefixStat[]
}

export function listFiles(prefix: string = '', offset: number = 0, limit: number = 50): Promise<ApiResponse<FileListData>> {
  const params: Record<string, any> = { offset, limit }
  if (prefix) params.prefix = prefix
  return getResponse('/ops/rustfs/files', params)
}

export function getFileInfo(path: string): Promise<ApiResponse<FileInfoData>> {
  return getResponse('/ops/rustfs/info', { path })
}

export function getSignedUrl(path: string, expire: number = 3600): Promise<ApiResponse<SignedUrlData>> {
  return getResponse('/ops/rustfs/url', { path, expire })
}

export function downloadFile(path: string, filename?: string): string {
  const params = new URLSearchParams({ path })
  if (filename) params.set('filename', filename)
  return `/api/v1/ops/rustfs/download?${params.toString()}`
}

export function uploadFile(file: File, path: string = '', content_type?: string): Promise<ApiResponse<RustFSFile>> {
  const form = new FormData()
  form.append('file', file)
  if (path) form.append('path', path)
  if (content_type) form.append('content_type', content_type)
  return postResponse('/ops/rustfs/upload', form)
}

export function deleteFile(path: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/ops/rustfs/delete?path=${encodeURIComponent(path)}`)
}

export function batchDeleteFiles(paths: string[]): Promise<ApiResponse<void>> {
  return postResponse('/ops/rustfs/batch-delete', { paths })
}

export function scanFiles(targets?: string): Promise<ApiResponse<ScanResult>> {
  const params: Record<string, any> = {}
  if (targets) params.targets = targets
  return getResponse('/ops/rustfs/scan', params)
}

export function cleanupFiles(paths?: string[]): Promise<ApiResponse<void>> {
  const body: Record<string, any> = {}
  if (paths && paths.length > 0) body.paths = paths
  return postResponse('/ops/rustfs/cleanup', body)
}

export function getBucketStats(): Promise<ApiResponse<BucketStats>> {
  return getResponse('/ops/rustfs/stats')
}
