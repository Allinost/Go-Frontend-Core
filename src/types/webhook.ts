export interface WebhookConfig {
  _id: string
  name: string
  type: 'feishu' | 'dingtalk' | 'wecom' | 'github' | 'generic'
  url: string
  status: 'active' | 'paused' | 'disabled'
  tags: string[]
  source: string
  signing_key?: string
  auth_type?: 'basic' | 'bearer' | 'header'
  auth_value?: string
  custom_headers: Record<string, string>
  whitelist_keywords: string[]
  whitelist_mode: 'any' | 'all'
  max_per_minute: number
  max_per_hour: number
  dedup_window: number
  timeout_ms: number
  last_sent_at?: string
  last_error: string
  total_sent: number
  total_failed: number
  created_at: string
}

export interface WebhookDeliveryLog {
  id: string
  webhook_id: string
  webhook_name: string
  webhook_type: string
  url: string
  status: 'success' | 'failed' | 'rate_limited' | 'deduped'
  source: string
  title: string
  content: string
  msg_type: string
  status_code: number
  response_body: string
  duration_ms: number
  error: string
  created_at: string
}

export interface SendReq {
  webhook_ids?: string[]
  tags?: string[]
  source: string
  title: string
  content: string
  msg_type: 'text' | 'markdown' | 'card' | 'interactive'
  data?: Record<string, any>
}

export interface WebhookResult {
  webhook_id: string
  webhook_name: string
  status: 'success' | 'failed' | 'rate_limited' | 'deduped'
  error: string
  duration_ms: number
}

export interface SendResult {
  success: number
  failed: number
  results: WebhookResult[]
}

export interface StatsResp {
  total_configs: number
  active_configs: number
  total_sent_today: number
  success_today: number
  failed_today: number
  rate_limited_today: number
  by_type: Record<string, number>
  by_source: Record<string, number>
}

export interface PaginatedResp<T> {
  items: T[]
  has_more: boolean
  total: number
}
