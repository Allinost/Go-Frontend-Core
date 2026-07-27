export interface Product {
  _id: string
  name: string
  platform: 'jd' | 'taobao' | 'pdd'
  url: string
  image_url?: string
  target_price?: number
  price_drop_ratio?: number
  last_price: number
  last_checked_at?: string
  next_check_at?: string
  check_interval: string
  cron_expr?: string
  custom_webhook_ids?: string[]
  enabled: boolean
  remark?: string
  created_at: string
}

export interface PriceRecord {
  id: number
  product_id: string
  price: number
  original_price?: number
  title?: string
  is_notified: boolean
  error_msg?: string
  created_at: string
}

export interface NotificationLog {
  id: number
  product_id: string
  price_record_id: number
  webhook_ids: string[]
  old_price: number
  new_price: number
  result_summary: 'all_success' | 'partial' | 'all_failed'
  created_at: string
}

export interface DashboardResp {
  total_products: number
  enabled_products: number
  today_checks: number
  today_notified: number
  recent_drops: DropItem[]
}

export interface DropItem {
  product_id: string
  name: string
  platform: string
  old_price: number
  new_price: number
  drop_percent: number
  dropped_at: string
}

export interface PaginatedResp<T> {
  items: T[]
  has_more: boolean
  total: number
}