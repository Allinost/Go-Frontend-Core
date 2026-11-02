export interface IntegrationConnector {
  id: string
  name: string
  type: string
  url: string
  headers?: Record<string, string> | null
  topics?: string[] | null
  timeout_seconds: number
  enabled: boolean
  secret_set: boolean
  created_at: string
  updated_at: string
}

export interface IntegrationConnectorReq {
  name: string
  type: string
  url: string
  secret?: string | null
  headers?: Record<string, string> | null
  topics?: string[] | null
  timeout_seconds?: number
  enabled?: boolean
}

export interface IntegrationEvent {
  id: string
  topic: string
  source: string
  aggregate_type: string
  aggregate_id: string
  payload: any
  status: 'pending' | 'delivered' | 'failed' | string
  attempts: number
  last_error?: string
  created_at: string
  updated_at: string
  delivered_at?: string | null
}

export interface DispatchResult {
  delivered: number
  failed: number
}
