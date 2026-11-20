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
  Milestone,
  Task,
  TaskDependency,
  TaskLog,
  MilestoneProgress,
  Risk,
  Release,
  Baseline,
  Iteration,
  Comment,
  ChecklistItem,
  Label,
  TaskAsset,
  ProjectDashboard,
  BoardColumn,
  RoadmapItem,
  WeeklyReport,
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

// ---------- V3 里程碑/任务 ----------

export function listMilestones(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Milestone>>(`${BASE}/projects/${projectId}/milestones`, params)
}

export function createMilestone(projectId: number | string, data: Record<string, any>) {
  return postResponse<Milestone>(`${BASE}/projects/${projectId}/milestones`, data)
}

export function getMilestone(id: number | string) {
  return getResponse<Milestone>(`${BASE}/milestones/${id}`)
}

export function updateMilestone(id: number | string, data: Record<string, any>) {
  return putResponse<Milestone>(`${BASE}/milestones/${id}`, data)
}

export function deleteMilestone(id: number | string) {
  return deleteResponse<any>(`${BASE}/milestones/${id}`)
}

export function getMilestoneProgress(id: number | string) {
  return getResponse<MilestoneProgress>(`${BASE}/milestones/${id}/progress`)
}

export function listTasks(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Task>>(`${BASE}/projects/${projectId}/tasks`, params)
}

export function createTask(projectId: number | string, data: Record<string, any>) {
  return postResponse<Task>(`${BASE}/projects/${projectId}/tasks`, data)
}

export function importTasks(projectId: number | string, tasks: Record<string, any>[]) {
  return postResponse<{ created: number; updated: number; skipped: number }>(
    `${BASE}/projects/${projectId}/tasks/import`,
    { tasks },
  )
}

export function getTask(id: number | string) {
  return getResponse<Task>(`${BASE}/tasks/${id}`)
}

export function updateTask(id: number | string, data: Record<string, any>) {
  return putResponse<Task>(`${BASE}/tasks/${id}`, data)
}

export function deleteTask(id: number | string) {
  return deleteResponse<any>(`${BASE}/tasks/${id}`)
}

export function changeTaskStatus(id: number | string, data: Record<string, any>) {
  return postResponse<Task>(`${BASE}/tasks/${id}/status`, data)
}

export function listTaskLogs(id: number | string, limit = 100) {
  return getResponse<{ items: TaskLog[] }>(`${BASE}/tasks/${id}/logs`, { limit })
}

export function addTaskLog(id: number | string, data: Record<string, any>) {
  return postResponse<TaskLog>(`${BASE}/tasks/${id}/logs`, data)
}

export function listDependencies(taskId: number | string) {
  return getResponse<{ items: TaskDependency[] }>(`${BASE}/tasks/${taskId}/dependencies`)
}

export function addDependency(taskId: number | string, data: Record<string, any>) {
  return postResponse<TaskDependency>(`${BASE}/tasks/${taskId}/dependencies`, data)
}

export function removeDependency(taskId: number | string, depId: number | string) {
  return deleteResponse<any>(`${BASE}/tasks/${taskId}/dependencies/${depId}`)
}

// ---------- V3 迭代/风险/发布/基线 ----------

export function listIterations(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Iteration>>(`${BASE}/projects/${projectId}/iterations`, params)
}

export function createIteration(projectId: number | string, data: Record<string, any>) {
  return postResponse<Iteration>(`${BASE}/projects/${projectId}/iterations`, data)
}

export function getIteration(id: number | string) {
  return getResponse<Iteration>(`${BASE}/iterations/${id}`)
}

export function updateIteration(id: number | string, data: Record<string, any>) {
  return putResponse<Iteration>(`${BASE}/iterations/${id}`, data)
}

export function deleteIteration(id: number | string) {
  return deleteResponse<any>(`${BASE}/iterations/${id}`)
}

export function listRisks(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Risk>>(`${BASE}/projects/${projectId}/risks`, params)
}

export function createRisk(projectId: number | string, data: Record<string, any>) {
  return postResponse<Risk>(`${BASE}/projects/${projectId}/risks`, data)
}

export function getRisk(id: number | string) {
  return getResponse<Risk>(`${BASE}/risks/${id}`)
}

export function updateRisk(id: number | string, data: Record<string, any>) {
  return putResponse<Risk>(`${BASE}/risks/${id}`, data)
}

export function deleteRisk(id: number | string) {
  return deleteResponse<any>(`${BASE}/risks/${id}`)
}

export function listReleases(projectId: number | string, params?: Record<string, any>) {
  return getResponse<PaginatedResp<Release>>(`${BASE}/projects/${projectId}/releases`, params)
}

export function createRelease(projectId: number | string, data: Record<string, any>) {
  return postResponse<Release>(`${BASE}/projects/${projectId}/releases`, data)
}

export function getRelease(id: number | string) {
  return getResponse<Release>(`${BASE}/releases/${id}`)
}

export function updateRelease(id: number | string, data: Record<string, any>) {
  return putResponse<Release>(`${BASE}/releases/${id}`, data)
}

export function deleteRelease(id: number | string) {
  return deleteResponse<any>(`${BASE}/releases/${id}`)
}

export function listBaselines(projectId: number | string) {
  return getResponse<{ items: Baseline[] }>(`${BASE}/projects/${projectId}/baselines`)
}

export function createBaseline(projectId: number | string, data: Record<string, any>) {
  return postResponse<Baseline>(`${BASE}/projects/${projectId}/baselines`, data)
}

export function getBaseline(id: number | string) {
  return getResponse<Baseline>(`${BASE}/baselines/${id}`)
}

export function deleteBaseline(id: number | string) {
  return deleteResponse<any>(`${BASE}/baselines/${id}`)
}

// ---------- V3 评论/检查项/标签/资产 ----------

export function listTaskComments(taskId: number | string) {
  return getResponse<{ items: Comment[] }>(`${BASE}/tasks/${taskId}/comments`)
}

export function addTaskComment(taskId: number | string, content: string) {
  return postResponse<Comment>(`${BASE}/tasks/${taskId}/comments`, { content })
}

export function deleteComment(id: number | string) {
  return deleteResponse<any>(`${BASE}/comments/${id}`)
}

export function listChecklist(taskId: number | string) {
  return getResponse<{ items: ChecklistItem[] }>(`${BASE}/tasks/${taskId}/checklist`)
}

export function createChecklistItem(taskId: number | string, data: Record<string, any>) {
  return postResponse<ChecklistItem>(`${BASE}/tasks/${taskId}/checklist`, data)
}

export function updateChecklistItem(id: number | string, data: Record<string, any>) {
  return putResponse<any>(`${BASE}/checklist/${id}`, data)
}

export function deleteChecklistItem(id: number | string) {
  return deleteResponse<any>(`${BASE}/checklist/${id}`)
}

export function listLabels(projectId: number | string) {
  return getResponse<{ items: Label[] }>(`${BASE}/projects/${projectId}/labels`)
}

export function createLabel(projectId: number | string, data: Record<string, any>) {
  return postResponse<Label>(`${BASE}/projects/${projectId}/labels`, data)
}

export function deleteLabel(id: number | string) {
  return deleteResponse<any>(`${BASE}/labels/${id}`)
}

export function listTaskLabels(taskId: number | string) {
  return getResponse<{ items: Label[] }>(`${BASE}/tasks/${taskId}/labels`)
}

export function addTaskLabel(taskId: number | string, labelId: number) {
  return postResponse<any>(`${BASE}/tasks/${taskId}/labels`, { label_id: labelId })
}

export function removeTaskLabel(taskId: number | string, labelId: number | string) {
  return deleteResponse<any>(`${BASE}/tasks/${taskId}/labels/${labelId}`)
}

export function listTaskAssets(taskId: number | string) {
  return getResponse<{ items: TaskAsset[] }>(`${BASE}/tasks/${taskId}/assets`)
}

export function addTaskAsset(taskId: number | string, assetId: number, relationType = 'input') {
  return postResponse<TaskAsset>(`${BASE}/tasks/${taskId}/assets`, { asset_id: assetId, relation_type: relationType })
}

export function removeTaskAsset(taskId: number | string, assetId: number | string) {
  return deleteResponse<any>(`${BASE}/tasks/${taskId}/assets/${assetId}`)
}

// ---------- V3 报表 ----------

export function getDashboard(projectId: number | string) {
  return getResponse<ProjectDashboard>(`${BASE}/projects/${projectId}/dashboard`)
}

export function getBoard(projectId: number | string) {
  return getResponse<{ columns: BoardColumn[] }>(`${BASE}/projects/${projectId}/board`)
}

export function getRoadmap(projectId: number | string) {
  return getResponse<{ items: RoadmapItem[] }>(`${BASE}/projects/${projectId}/roadmap`)
}

export function getWeeklyReport(projectId: number | string, params?: Record<string, any>) {
  return getResponse<WeeklyReport>(`${BASE}/projects/${projectId}/report/weekly`, params)
}
