export interface Login3rdPlatform {
  id: string
  name: string
  has_auto: boolean
  login_url: string
  form_config?: Login3rdFormConfig
}

export interface Login3rdFormConfig {
  tab_selector?: string
  username_selector?: string
  password_selector?: string
  submit_selector?: string
  captcha_selector?: string
  success_cookies?: string[]
  success_url_prefix?: string
  login_wait_selector?: string
  max_auto_retry?: number
  // 兼容旧前端字段；后端当前返回上面的选择器配置。
  url?: string
  preset_buttons?: Login3rdPresetButton[]
  auto_fields?: Login3rdAutoField[]
}

export interface Login3rdPresetButton {
  label: string
  selector: string
}

export interface Login3rdAutoField {
  label: string
  selector: string
  value: string
}

export interface Login3rdAccount {
  id: string
  platform_id: string
  platform_name?: string
  label: string
  username: string
  webhook_ids: string[]
  created_at: string
  updated_at: string
}

export interface CreateAccountReq {
  platform_id: string
  label: string
  username: string
  password: string
  webhook_ids?: string[]
}

export interface UpdateAccountReq {
  label?: string
  username?: string
  password?: string
  webhook_ids?: string[]
}

export interface RemoteLoginResp {
  token: string
  url: string
  ws_url?: string
  is_local?: boolean
}

export interface RemoteSessionStatus {
  done: boolean
  success: boolean
  error: string
}

export interface VerifySessionResp {
  valid: boolean
}

export interface AccountStatus {
  account: Login3rdAccount
  platform: Login3rdPlatform
  session_valid: boolean
  session_expires_in: string
  can_auto_login: boolean
}

export interface RemoteSessionEvent {
  type: 'screenshot' | 'success' | 'error' | 'timeout'
  data?: string
  message?: string
  timestamp: number
}

export interface PaginatedAccounts {
  items: Login3rdAccount[]
  total: number
  page: number
  page_size: number
}

export interface SchedulerTask {
  id: string
  name: string
  type: string
  expression: string
  description?: string
  interval?: string
  handler: string
  status: 'active' | 'paused' | 'disabled'
  last_run_at?: string
  next_run_at?: string
  created_at: string
}

export interface SchedulerTaskLog {
  id: string
  task_id: string
  status: 'success' | 'failed' | 'running' | 'timeout'
  message?: string
  error?: string
  started_at: string
  ended_at?: string
  finished_at?: string
  duration_ms?: number
}

export interface SchedulerHandler {
  name: string
  description: string
  default_interval: string
}

export interface SchedulerTaskList {
  items: SchedulerTask[]
  total: number
}