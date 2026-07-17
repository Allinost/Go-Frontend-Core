import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'

export interface Task {
  id: number
  name: string
  type: 'cron' | 'once' | 'interval'
  expression: string
  handler: string
  payload?: Record<string, any>
  status: 'active' | 'paused' | 'finished'
  max_retries: number
  timeout: number
  last_run_at?: string
  next_run_at?: string
  created_at: string
  updated_at: string
}

export interface TaskLog {
  id: number
  task_id: number
  task_name: string
  status: 'running' | 'success' | 'failed' | 'timeout'
  started_at: string
  ended_at?: string
  result?: string
  error?: string
  created_at: string
}

export interface CreateTaskRequest {
  name: string
  type: 'cron' | 'once' | 'interval'
  expression: string
  handler: string
  payload?: Record<string, any>
  max_retries?: number
  timeout?: number
}

export interface UpdateTaskRequest {
  name?: string
  type?: 'cron' | 'once' | 'interval'
  expression?: string
  handler?: string
  payload?: Record<string, any>
  max_retries?: number
  timeout?: number
}

export function listTasks(): Promise<ApiResponse<Task[]>> {
  return getResponse('/scheduler/tasks')
}

export function createTask(data: CreateTaskRequest): Promise<ApiResponse<Task>> {
  return postResponse('/scheduler/tasks', data)
}

export function getTask(id: number): Promise<ApiResponse<Task>> {
  return getResponse(`/scheduler/tasks/${id}`)
}

export function updateTask(id: number, data: UpdateTaskRequest): Promise<ApiResponse<Task>> {
  return putResponse(`/scheduler/tasks/${id}`, data)
}

export function deleteTask(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  return deleteResponse(`/scheduler/tasks/${id}`)
}

export function pauseTask(id: number): Promise<ApiResponse<Task>> {
  return postResponse(`/scheduler/tasks/${id}/pause`)
}

export function resumeTask(id: number): Promise<ApiResponse<Task>> {
  return postResponse(`/scheduler/tasks/${id}/resume`)
}

export function runTask(id: number): Promise<ApiResponse<{ message: string }>> {
  return postResponse(`/scheduler/tasks/${id}/run`)
}

export function getTaskLogs(id: number): Promise<ApiResponse<TaskLog[]>> {
  return getResponse(`/scheduler/tasks/${id}/logs`)
}

export function listHandlers(): Promise<ApiResponse<string[]>> {
  return getResponse('/scheduler/handlers')
}
