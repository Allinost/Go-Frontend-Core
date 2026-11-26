import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import request from './request'
import type { ApiResponse } from '@/types/api'
import type {
  Catalog,
  CatalogDetail,
  CatalogImage,
  CatalogItem,
} from '@/types/goodserCatalog'

const BASE = 'goodser-catalog'

export function listCatalogs(params?: { inventory_id?: string; keyword?: string }) {
  return getResponse<{ items: Catalog[] }>(`${BASE}/catalogs`, params)
}

export function createCatalog(data: { title: string; remark?: string; inventory_id?: string }) {
  return postResponse<Catalog>(`${BASE}/catalogs`, data)
}

export function getCatalog(id: string) {
  return getResponse<CatalogDetail>(`${BASE}/catalogs/${id}`)
}

export function updateCatalog(id: string, data: { title?: string; remark?: string; status?: string }) {
  return putResponse<Catalog>(`${BASE}/catalogs/${id}`, data)
}

export function deleteCatalog(id: string) {
  return deleteResponse<{ deleted: boolean }>(`${BASE}/catalogs/${id}`)
}

export function addCatalogImage(
  catalogId: string,
  data: { image_url: string; width?: number; height?: number },
) {
  return postResponse<CatalogImage>(`${BASE}/catalogs/${catalogId}/images`, data)
}

export async function uploadCatalogImage(catalogId: string, file: File): Promise<ApiResponse<CatalogImage>> {
  const form = new FormData()
  form.append('image', file)
  const res = await request.post<ApiResponse<CatalogImage>>(
    `${BASE}/catalogs/${catalogId}/images`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

export function segmentCatalogImage(imageId: string) {
  return postResponse<{ boxes: unknown[]; items: CatalogItem[] }>(
    `${BASE}/catalog-images/${imageId}/segment`,
  )
}

export function createCatalogItem(
  catalogId: string,
  data: {
    image_id?: string
    product_id?: string
    title?: string
    remark?: string
    image_url: string
    thumb_url?: string
    box?: unknown
    sort_order?: number
  },
) {
  return postResponse<CatalogItem>(`${BASE}/catalogs/${catalogId}/items`, data)
}

export function updateCatalogItem(
  id: string,
  data: {
    product_id?: string
    title?: string
    remark?: string
    image_url?: string
    thumb_url?: string
    box?: unknown
    sort_order?: number
    status?: string
  },
) {
  return putResponse<CatalogItem>(`${BASE}/catalog-items/${id}`, data)
}

export function deleteCatalogItem(id: string) {
  return deleteResponse<{ deleted: boolean }>(`${BASE}/catalog-items/${id}`)
}
