// Inventory (库存目录)
export interface Inventory {
  _id: string
  inventory_id?: string // alias for _id
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateInventoryReq {
  name: string
}

export interface UpdateInventoryReq {
  id: string
  name?: string
}

// Product (商品)
export interface Product {
  _id: string
  inventory_id: string
  code: string
  main_zone: string
  sub_zone: string
  seq_number: number
  /** 可用库存 */
  quantity: number
  /** 已锁定库存（预留中/待出库） */
  reserved_quantity: number
  /** 物理总量 = quantity + reserved_quantity */
  total_quantity: number
  status_code: string
  name: string
  original_price: number | null
  market_price: number | null
  expected_price: number | null
  remark: string | null
  storage_location: string | null
  image_url: string | null
  images: string[] | null
  tags: string[] | null
  /** 系列字典 ID */
  series_id?: string | null
  /** 套型字典 ID */
  set_type_id?: string | null
  /** 商品类型字典 ID */
  product_type_id?: string | null
  /** 关联角色字典 ID 列表 */
  character_ids?: string[] | null
  created_at: string
  updated_at: string
}

export interface CreateProductReq {
  inventory_id: string
  code: string
  main_zone: string
  sub_zone: string
  seq_number: number
  quantity: number | null
  status_code: string
  name: string
  original_price?: number | null
  market_price?: number | null
  expected_price?: number | null
  remark?: string | null
  storage_location?: string | null
  image_url?: string | null
  tags?: string[] | null
  series_id?: string | null
  set_type_id?: string | null
  product_type_id?: string | null
  character_ids?: string[] | null
}

export interface UpdateProductReq {
  id: string
  name?: string | null
  main_zone?: string | null
  sub_zone?: string | null
  code?: string | null
  seq_number?: number | null
  quantity?: number | null
  status_code?: string | null
  original_price?: number | null
  market_price?: number | null
  expected_price?: number | null
  remark?: string | null
  storage_location?: string | null
  image_url?: string | null
  tags?: string[] | null
  series_id?: string | null
  set_type_id?: string | null
  product_type_id?: string | null
  character_ids?: string[] | null
}

export interface AllocateSeqReq {
  inventory_id: string
  main_zone: string
  sub_zone: string
}

export interface AllocateSeqResp {
  seq_number: number
}

export interface QueryProductsReq {
  inventory_id: string
  keyword?: string
  status_code?: string
  main_zone?: string
  sub_zone?: string
  tag_id?: string
  series_id?: string
  character_id?: string
  set_type_id?: string
  product_type_id?: string
  only_available?: boolean
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: string
}

// Inbound (入库)
export interface InboundLog {
  _id: string
  inventory_id: string
  order_no: string | null
  type: string
  remark: string | null
  items: OrderItem[] | null
  created_at: string
}

export interface InboundSingleReq {
  inventory_id: string
  order_no?: string | null
  code: string
  main_zone: string
  sub_zone: string
  seq_number: number
  quantity: number | null
  status_code: string
  name: string
  original_price?: number | null
  market_price?: number | null
  expected_price?: number | null
  remark?: string | null
  storage_location?: string | null
  image_url?: string | null
  tags?: string[] | null
  series_id?: string | null
  set_type_id?: string | null
  product_type_id?: string | null
  character_ids?: string[] | null
}

export interface InboundBatchReq {
  inventory_id: string
  order_no?: string | null
  remark?: string | null
  items: InboundBatchItem[]
}

export interface InboundBatchItem {
  code: string
  main_zone: string
  sub_zone: string
  seq_number: number
  quantity: number | null
  status_code: string
  name: string
  original_price?: number | null
  market_price?: number | null
  expected_price?: number | null
  remark?: string | null
  storage_location?: string | null
  image_url?: string | null
  tags?: string[] | null
  series_id?: string | null
  set_type_id?: string | null
  product_type_id?: string | null
  character_ids?: string[] | null
}

export interface InboundSearchImportReq {
  inventory_id: string
  order_no?: string | null
  remark?: string | null
  items: SearchImportItem[]
}

export interface SearchImportItem {
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  image_url?: string | null
}

export interface CreateInboundLogReq {
  inventory_id: string
  order_no?: string | null
  type: string
  remark?: string | null
  items: OrderItem[]
}

export interface UpdateInboundLogReq {
  id: string
  order_no?: string | null
  type?: string | null
  remark?: string | null
  items?: OrderItem[] | null
}

// Outbound (出库)
export interface OutboundOrder {
  _id: string
  inventory_id: string
  order_no: string
  type: string
  status: string
  order_info: string | null
  remark: string | null
  items: OrderItem[] | null
  source_reserve_id: string | null
  combo_id?: string | null
  combo_quantity?: number | null
  bundle_id?: string | null
  bundle_main_product_id?: string | null
  bundle_quantity?: number | null
  bundle_snapshot?: BundleOrderSnapshot | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  converted_at: string | null
  returned_at: string | null
}

export interface OrderItem {
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  image_url?: string | null
}

export interface CreateOutboundReq {
  inventory_id: string
  order_no: string
  type?: string
  order_info?: string | null
  remark?: string | null
  items: OrderItem[]
  source_reserve_id?: string | null
  combo_id?: string | null
  combo_quantity?: number | null
  /** 使用捆下单时 items 必须为空，由服务端展开 */
  bundle?: BundleOrderSelection | null
}

export interface ReserveToOutboundReq {
  id: string
  inventory_id: string
  order_no: string
  /** 转单沿用原预留单明细，后端会忽略该字段 */
  items?: OrderItem[]
  order_info?: string | null
  remark?: string | null
}

// Returns (退货)
export type ReturnReason = 'refund_only' | 'return_refund' | 'shipping_damage' | 'other'

export interface ReturnItem {
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  /** 确认退货时是否回可用库存，refund_only 时强制 false */
  restock?: boolean | null
  image_url?: string | null
}

export interface ReturnOrder {
  _id: string
  inventory_id: string
  outbound_order_id: string
  order_no: string
  status: 'pending' | 'confirmed' | 'cancelled'
  reason: ReturnReason
  remark: string | null
  items: ReturnItem[] | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  cancelled_at: string | null
}

export interface CreateReturnReq {
  outbound_order_id: string
  reason?: ReturnReason
  remark?: string | null
  items: ReturnItem[]
}

export interface PaginatedReq {
  inventory_id: string
  page?: number
  page_size?: number
}

// Tags
export interface GoodserTag {
  _id: string
  name: string
  color: string
  created_at: string
}

export interface CreateTagReq {
  name: string
  color?: string | null
}

export interface UpdateTagReq {
  id: string
  name?: string | null
  color?: string | null
}

// Status Codes
export interface StatusCode {
  _id: string
  code: string
  label: string
  is_system: boolean
  created_at: string
}

export interface AddStatusCodeReq {
  code: string
  label: string
}

export interface UpdateStatusCodeReq {
  id: string
  label: string
}

// Common
export interface IdReq {
  id: string
}

export interface UploadImageResp {
  url: string
}

export interface PaginatedResp<T> {
  items: T[]
  has_more: boolean
  total: number
}

export interface SyncAllResp {
  inventories: Inventory[]
  products: Record<string, Product[]> | null
  outbound_orders: Record<string, OutboundOrder[]> | null
  inbound_logs: Record<string, InboundLog[]> | null
  tags: GoodserTag[]
  status_codes: StatusCode[]
}

// ---- P1: 受控维度字典 ----
export type DictionaryKind = 'series' | 'character' | 'set_type' | 'product_type'

export interface Dictionary {
  _id: string
  kind: DictionaryKind
  code: string
  name: string
  parent_id?: string | null
  sort_order: number
  enabled: boolean
  extra?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CreateDictionaryReq {
  kind: DictionaryKind
  code: string
  name: string
  parent_id?: string | null
  sort_order?: number
  enabled?: boolean | null
  extra?: Record<string, unknown> | null
}

export interface UpdateDictionaryReq {
  id: string
  code?: string | null
  name?: string | null
  parent_id?: string | null
  sort_order?: number | null
  enabled?: boolean | null
  extra?: Record<string, unknown> | null
}

// ---- P1: 系列聚合视图 ----
export interface SeriesSummary {
  series_id: string
  series_name: string
  product_count: number
  total_quantity: number
  available: number
}

// ---- P1: 组合包 BOM ----
export interface ComboItem {
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  available: number
  image_url?: string | null
}

export interface Combo {
  _id: string
  inventory_id: string
  code: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  status: 'active' | 'inactive'
  items: ComboItem[]
  availability: number
  created_at: string
  updated_at: string
}

export interface ComboItemReq {
  product_id: string
  quantity: number
}

export interface CreateComboReq {
  inventory_id: string
  code?: string | null
  name: string
  description?: string | null
  image_url?: string | null
  price?: number | null
  status?: 'active' | 'inactive' | null
  items: ComboItemReq[]
}

export interface UpdateComboReq {
  id: string
  code?: string | null
  name?: string | null
  description?: string | null
  image_url?: string | null
  price?: number | null
  status?: 'active' | 'inactive' | null
  items?: ComboItemReq[] | null
}

// ---- P1.5: 捆 ----
export type BundleStatus = 'active' | 'inactive'
export type BundlePriceMode = 'sum' | 'fixed' | 'main_only'

export interface BundleMainFilter {
  series_id?: string
  set_type_id?: string
  product_type_id?: string
  character_id?: string
  status_code?: string
  keyword?: string
}

export interface BundleMainProduct {
  product_id: string
  product_name: string
  product_code: string
  image_url?: string | null
  expected_price: number
  available: number
  reserved_quantity: number
  total_quantity: number
  series_id?: string | null
  set_type_id?: string | null
  product_type_id?: string | null
  character_ids?: string[] | null
}

export interface BundleSubProduct {
  product_id: string
  product_name: string
  product_code: string
  image_url?: string | null
  default_quantity: number
  expected_price: number
  available: number
  reserved_quantity: number
  total_quantity: number
}

export interface Bundle {
  _id: string
  inventory_id: string
  code: string
  name: string
  description: string | null
  status: BundleStatus
  main_filter: BundleMainFilter
  main_product_ids: string[]
  main_products: BundleMainProduct[]
  sub_products: BundleSubProduct[]
  min_main_quantity: number
  min_main_amount: number
  min_sub_quantity: number
  max_sub_quantity: number
  min_sub_amount: number
  price_mode: BundlePriceMode
  fixed_price: number
  created_at: string
  updated_at: string
}

export interface BundleSubItemReq {
  product_id: string
  default_quantity: number
}

export interface CreateBundleReq {
  inventory_id: string
  code?: string | null
  name: string
  description?: string | null
  status?: BundleStatus | null
  main_filter?: BundleMainFilter | null
  main_product_ids?: string[]
  sub_products: BundleSubItemReq[]
  min_main_quantity?: number
  min_main_amount?: number
  min_sub_quantity?: number
  max_sub_quantity?: number
  min_sub_amount?: number
  price_mode?: BundlePriceMode | null
  fixed_price?: number
}

export interface UpdateBundleReq {
  id: string
  code?: string | null
  name?: string | null
  description?: string | null
  status?: BundleStatus | null
  main_filter?: BundleMainFilter | null
  main_product_ids?: string[]
  sub_products?: BundleSubItemReq[]
  min_main_quantity?: number
  min_main_amount?: number
  min_sub_quantity?: number
  max_sub_quantity?: number
  min_sub_amount?: number
  price_mode?: BundlePriceMode | null
  fixed_price?: number
}

export interface BundleOrderSubItem {
  product_id: string
  quantity: number
}

export interface BundleOrderSelection {
  bundle_id: string
  main_product_id: string
  main_quantity: number
  quantity: number
  sub_items: BundleOrderSubItem[]
}

export interface BundlePreviewReq {
  main_product_id: string
  main_quantity: number
  quantity: number
  sub_items: BundleOrderSubItem[]
}

export interface BundleSelectedSubItem {
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  amount: number
  available: number
  image_url?: string | null
}

export interface BundleOrderSnapshot {
  bundle_id: string
  bundle_code: string
  bundle_name: string
  main_product_id: string
  main_product_name: string
  main_quantity: number
  quantity: number
  sub_items: BundleSelectedSubItem[]
  price_mode: BundlePriceMode
  min_main_quantity: number
  min_main_amount: number
  min_sub_quantity: number
  max_sub_quantity: number
  min_sub_amount: number
  unit_price: number
  total_price: number
}

// ---- P1.5: 统计 ----

export interface StatsStock {
  total_products: number
  available: number
  reserved: number
  total: number
  stock_value: number
  out_of_stock: number
}

export interface StatsOrderCounts {
  pending_outbound: number
  confirmed_outbound: number
  cancelled_outbound: number
  pending_reserves: number
  pending_returns: number
  confirmed_returns: number
}

export interface StatsTrendPoint {
  date: string
  outbound_quantity: number
  return_quantity: number
}

export interface StatsSeriesRow {
  series_id: string | null
  series_name: string
  product_count: number
  available: number
  reserved: number
  total: number
  stock_value: number
}

export interface StatsTopProduct {
  product_id: string
  product_name: string
  product_code: string
  outbound_quantity: number
}

export interface StatsOverview {
  inventory_id: string
  inventory_name: string
  days: number
  generated_at: string
  stock: StatsStock
  orders: StatsOrderCounts
  trend: StatsTrendPoint[]
  series: StatsSeriesRow[]
  top_products: StatsTopProduct[]
}

export interface BundlePreviewResp {
  bundle_id: string
  bundle_code: string
  bundle_name: string
  inventory_id: string
  price_mode: BundlePriceMode
  quantity: number
  main_product: BundleMainProduct
  main_quantity: number
  main_amount: number
  sub_items: BundleSelectedSubItem[]
  sub_quantity: number
  sub_amount: number
  unit_price: number
  total_price: number
  items: OrderItem[]
  snapshot: BundleOrderSnapshot
}
