import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type {
  Project,
  ProjectStats,
  ProjectRelation,
  ProjectAsset,
  Container,
  ResourceAlloc,
  VolumeMapping,
  AccessPoint,
  Whitelist,
  WhitelistMember,
  Backup,
  DBTable,
  DBColumn,
  Requirement,
  RequirementVersion,
  Generation,
  ScanImportResp,
  ExpandAssetResp,
  PaginatedResp,
} from '@/types/developmentManager'

const BASE = 'developmentmanager'

// ---------- 项目台账 ----------
export function listProjects(params?: Record<string, any>) {
  return getResponse<PaginatedResp<Project>>(`${BASE}/projects`, params)
}

export function getProject(id: number | string) {
  return getResponse<Project>(`${BASE}/projects/${id}`)
}

export function createProject(data: Record<string, any>) {
  return postResponse<Project>(`${BASE}/projects`, data)
}

export function updateProject(id: number | string, data: Record<string, any>) {
  return putResponse<Project>(`${BASE}/projects/${id}`, data)
}

export function deleteProject(id: number | string, force = false) {
  return deleteResponse<any>(`${BASE}/projects/${id}${force ? '?force=1' : ''}`)
}

export function getStats() {
  return getResponse<ProjectStats>(`${BASE}/stats`)
}

export function getPermissionMeta() {
  return getResponse<any[]>(`${BASE}/permissions/meta`)
}

// ---------- 项目关联 ----------
export function listRelations(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<ProjectRelation>>(`${BASE}/projects/${projectId}/relations`, params)
}

export function createRelation(projectId: number | string, data: Record<string, any>) {
  return postResponse<ProjectRelation>(`${BASE}/projects/${projectId}/relations`, data)
}

export function deleteRelation(projectId: number | string, relationId: number | string) {
  return deleteResponse<any>(`${BASE}/projects/${projectId}/relations/${relationId}`)
}

// ---------- 归类资产 ----------
export function listAssets(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<ProjectAsset>>(`${BASE}/projects/${projectId}/assets`, params)
}

export function createAsset(projectId: number | string, data: Record<string, any>) {
  return postResponse<ProjectAsset>(`${BASE}/projects/${projectId}/assets`, data)
}

export function deleteAsset(projectId: number | string, assetId: number | string) {
  return deleteResponse<any>(`${BASE}/projects/${projectId}/assets/${assetId}`)
}

export function expandAsset(projectId: number | string, data: { asset_id: number }) {
  return postResponse<ExpandAssetResp>(`${BASE}/projects/${projectId}/assets/expand`, data)
}

export function expandAllAssets(projectId: number | string) {
  return postResponse<ExpandAssetResp>(`${BASE}/projects/${projectId}/assets/expand-all`)
}

// ---------- 部署资产：容器 ----------
export function listContainers(projectId: number | string, params?: Record<string, any>) {
  return getResponse<Container[]>(`${BASE}/projects/${projectId}/containers`, params)
}

export function createContainer(projectId: number | string, data: Record<string, any>) {
  return postResponse<Container>(`${BASE}/projects/${projectId}/containers`, data)
}

export function updateContainer(id: number | string, data: Record<string, any>) {
  return putResponse<Container>(`${BASE}/containers/${id}`, data)
}

export function deleteContainer(id: number | string) {
  return deleteResponse<any>(`${BASE}/containers/${id}`)
}

export function getResourceAlloc(containerId: number | string) {
  return getResponse<ResourceAlloc>(`${BASE}/containers/${containerId}/resources`)
}

export function upsertResourceAlloc(containerId: number | string, data: Record<string, any>) {
  return putResponse<ResourceAlloc>(`${BASE}/containers/${containerId}/resources`, data)
}

// ---------- 部署资产：卷映射 ----------
export function listVolumes(containerId: number | string, params?: Record<string, any>) {
  return getResponse<VolumeMapping[]>(`${BASE}/containers/${containerId}/volumes`, params)
}

export function createVolume(containerId: number | string, data: Record<string, any>) {
  return postResponse<VolumeMapping>(`${BASE}/containers/${containerId}/volumes`, data)
}

export function updateVolume(id: number | string, data: Record<string, any>) {
  return putResponse<VolumeMapping>(`${BASE}/volumes/${id}`, data)
}

export function deleteVolume(id: number | string) {
  return deleteResponse<any>(`${BASE}/volumes/${id}`)
}

// ---------- 部署资产：网络接入点 ----------
export function listAccessPoints(projectId: number | string, params?: Record<string, any>) {
  return getResponse<AccessPoint[]>(`${BASE}/projects/${projectId}/access-points`, params)
}

export function createAccessPoint(projectId: number | string, data: Record<string, any>) {
  return postResponse<AccessPoint>(`${BASE}/projects/${projectId}/access-points`, data)
}

export function updateAccessPoint(id: number | string, data: Record<string, any>) {
  return putResponse<AccessPoint>(`${BASE}/access-points/${id}`, data)
}

export function deleteAccessPoint(id: number | string) {
  return deleteResponse<any>(`${BASE}/access-points/${id}`)
}

// ---------- 部署资产：白名单 ----------
export function listWhitelists(projectId: number | string, params?: Record<string, any>) {
  return getResponse<Whitelist[]>(`${BASE}/projects/${projectId}/whitelists`, params)
}

export function createWhitelist(projectId: number | string, data: Record<string, any>) {
  return postResponse<Whitelist>(`${BASE}/projects/${projectId}/whitelists`, data)
}

export function updateWhitelist(id: number | string, data: Record<string, any>) {
  return putResponse<Whitelist>(`${BASE}/whitelists/${id}`, data)
}

export function deleteWhitelist(id: number | string) {
  return deleteResponse<any>(`${BASE}/whitelists/${id}`)
}

export function listWhitelistMembers(id: number | string) {
  return getResponse<WhitelistMember[]>(`${BASE}/whitelists/${id}/members`)
}

export function addWhitelistMember(id: number | string, data: Record<string, any>) {
  return postResponse<WhitelistMember>(`${BASE}/whitelists/${id}/members`, data)
}

export function removeWhitelistMember(id: number | string, memberId: number | string) {
  return deleteResponse<any>(`${BASE}/whitelists/${id}/members/${memberId}`)
}

// ---------- 部署资产：备份 ----------
export function listBackups(projectId: number | string) {
  return getResponse<Backup[]>(`${BASE}/projects/${projectId}/backups`)
}

export function createBackup(projectId: number | string, data: Record<string, any>) {
  return postResponse<Backup>(`${BASE}/projects/${projectId}/backups`, data)
}

export function updateBackup(id: number | string, data: Record<string, any>) {
  return putResponse<Backup>(`${BASE}/backups/${id}`, data)
}

export function deleteBackup(id: number | string) {
  return deleteResponse<any>(`${BASE}/backups/${id}`)
}

// ---------- 数据字典 ----------
export function listTables(projectId: number | string, params?: Record<string, any>) {
  return getResponse<DBTable[]>(`${BASE}/projects/${projectId}/tables`, params)
}

export function createTable(projectId: number | string, data: Record<string, any>) {
  return postResponse<DBTable>(`${BASE}/projects/${projectId}/tables`, data)
}

export function updateTable(id: number | string, data: Record<string, any>) {
  return putResponse<DBTable>(`${BASE}/tables/${id}`, data)
}

export function deleteTable(id: number | string) {
  return deleteResponse<any>(`${BASE}/tables/${id}`)
}

export function listColumns(tableId: number | string) {
  return getResponse<DBColumn[]>(`${BASE}/tables/${tableId}/columns`)
}

export function createColumn(tableId: number | string, data: Record<string, any>) {
  return postResponse<DBColumn>(`${BASE}/tables/${tableId}/columns`, data)
}

export function updateColumn(id: number | string, data: Record<string, any>) {
  return putResponse<DBColumn>(`${BASE}/columns/${id}`, data)
}

export function deleteColumn(id: number | string) {
  return deleteResponse<any>(`${BASE}/columns/${id}`)
}

export function scanImportColumns(tableId: number | string) {
  return postResponse<ScanImportResp>(`${BASE}/tables/${tableId}/scan-import`)
}

// ---------- 需求 ----------
export function listRequirements(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Requirement>>(`${BASE}/projects/${projectId}/requirements`, params)
}

export function getRequirement(id: number | string) {
  return getResponse<Requirement>(`${BASE}/requirements/${id}`)
}

export function createRequirement(projectId: number | string, data: Record<string, any>) {
  return postResponse<Requirement>(`${BASE}/projects/${projectId}/requirements`, data)
}

export function updateRequirement(id: number | string, data: Record<string, any>) {
  return putResponse<Requirement>(`${BASE}/requirements/${id}`, data)
}

export function changeRequirementStatus(id: number | string, data: Record<string, any>) {
  return postResponse<Requirement>(`${BASE}/requirements/${id}/status`, data)
}

export function deleteRequirement(id: number | string) {
  return deleteResponse<any>(`${BASE}/requirements/${id}`)
}

export function listRequirementVersions(id: number | string) {
  return getResponse<RequirementVersion[]>(`${BASE}/requirements/${id}/versions`)
}

// ---------- 生成任务 ----------
export function createGeneration(requirementId: number | string, data: Record<string, any>) {
  return postResponse<Generation>(`${BASE}/requirements/${requirementId}/generations`, data)
}

export function listGenerations(requirementId: number | string) {
  return getResponse<Generation[]>(`${BASE}/requirements/${requirementId}/generations`)
}

export function getGeneration(id: number | string) {
  return getResponse<Generation>(`${BASE}/generations/${id}`)
}

export function retryGeneration(id: number | string) {
  return postResponse<Generation>(`${BASE}/generations/${id}/retry`)
}
