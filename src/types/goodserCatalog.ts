export interface Catalog {
  _id: string
  inventory_id?: string
  title: string
  remark?: string
  cover_url?: string
  status: string
  image_count: number
  item_count: number
  created_at: string
  updated_at: string
}

export interface CatalogImage {
  _id: string
  catalog_id: string
  image_url: string
  width?: number
  height?: number
  crop_status: string
  crop_error?: string
  created_at: string
}

export interface CatalogItem {
  _id: string
  catalog_id: string
  image_id?: string
  product_id?: string
  title?: string
  remark?: string
  image_url: string
  thumb_url?: string
  box?: unknown
  sort_order: number
  status: string
  created_at: string
  updated_at: string
}

export interface CatalogDetail extends Catalog {
  images: CatalogImage[]
  items: CatalogItem[]
}
