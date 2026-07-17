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
  quantity: number
  reserved_quantity: number
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
  created_at: string
  updated_at: string
  confirmed_at: string | null
  cancelled_at: string | null
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
  status?: string | null
  order_info?: string | null
  remark?: string | null
  items: OrderItem[]
  source_reserve_id?: string | null
}

export interface ReserveToOutboundReq {
  id: string
  inventory_id: string
  order_no: string
  items: OrderItem[]
  order_info?: string | null
  remark?: string | null
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
