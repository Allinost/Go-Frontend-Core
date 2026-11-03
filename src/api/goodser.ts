import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import request from './request'
import type { ApiResponse } from '@/types/api'
import type {
  Inventory, CreateInventoryReq, UpdateInventoryReq,
  Product, CreateProductReq, UpdateProductReq, QueryProductsReq, AllocateSeqReq, AllocateSeqResp,
  InboundLog, InboundSingleReq, InboundBatchReq, InboundSearchImportReq,
  CreateInboundLogReq, UpdateInboundLogReq,
  OutboundOrder, CreateOutboundReq, ReserveToOutboundReq,
  ReturnOrder, CreateReturnReq,
  GoodserTag, CreateTagReq, UpdateTagReq,
  StatusCode, AddStatusCodeReq, UpdateStatusCodeReq,
  IdReq, PaginatedReq, PaginatedResp, UploadImageResp, SyncAllResp,
  Dictionary, DictionaryKind, CreateDictionaryReq, UpdateDictionaryReq,
  SeriesSummary, Combo, CreateComboReq, UpdateComboReq,
  Bundle, CreateBundleReq, UpdateBundleReq, BundleMainProduct, BundleSubProduct,
  BundlePreviewReq, BundlePreviewResp, StatsOverview,
} from '@/types/goodser'

// Inventories
export function loadInventories() {
  return postResponse<Inventory[]>('zzz-goodser/legacy/loadInventories')
}

export function createInventory(data: CreateInventoryReq) {
  return postResponse<Inventory>('zzz-goodser/legacy/createInventory', data)
}

export function updateInventory(data: UpdateInventoryReq) {
  return postResponse<Inventory>('zzz-goodser/legacy/updateInventory', data)
}

export function deleteInventory(data: IdReq) {
  return postResponse<any>('zzz-goodser/legacy/deleteInventory', data)
}

// Products
export function loadProducts(data: PaginatedReq) {
  return postResponse<PaginatedResp<Product>>('zzz-goodser/legacy/loadProducts', data)
}

export function queryProducts(data: QueryProductsReq) {
  return postResponse<PaginatedResp<Product>>('zzz-goodser/legacy/queryProducts', data)
}

export function createProduct(data: CreateProductReq) {
  return postResponse<Product>('zzz-goodser/legacy/createProduct', data)
}

export function updateProduct(data: UpdateProductReq) {
  return postResponse<Product>('zzz-goodser/legacy/updateProduct', data)
}

export function deleteProduct(data: IdReq) {
  return postResponse<any>('zzz-goodser/legacy/deleteProduct', data)
}

export function allocateSeq(data: AllocateSeqReq) {
  return postResponse<AllocateSeqResp>('zzz-goodser/legacy/allocateSeq', data)
}

// Inbound
export function inboundSingle(data: InboundSingleReq) {
  return postResponse<Product>('zzz-goodser/legacy/inboundSingle', data)
}

export function inboundBatch(data: InboundBatchReq) {
  return postResponse<{ items: Product[]; count: number }>('zzz-goodser/legacy/inboundBatch', data)
}

export function inboundSearchImport(data: InboundSearchImportReq) {
  return postResponse<{ items: Product[]; count: number }>('zzz-goodser/legacy/inboundSearchImport', data)
}

export function loadInboundLogs(data: PaginatedReq) {
  return postResponse<PaginatedResp<InboundLog>>('zzz-goodser/legacy/loadInboundLogs', data)
}

export function createInboundLog(data: CreateInboundLogReq) {
  return postResponse<InboundLog>('zzz-goodser/legacy/createInboundLog', data)
}

export function updateInboundLog(data: UpdateInboundLogReq) {
  return postResponse<InboundLog>('zzz-goodser/legacy/updateInboundLog', data)
}

export function deleteInboundLog(data: IdReq) {
  return postResponse<any>('zzz-goodser/legacy/deleteInboundLog', data)
}

// Outbound
export function loadOutboundOrders(data: PaginatedReq) {
  return postResponse<PaginatedResp<OutboundOrder>>('zzz-goodser/legacy/loadOutboundOrders', data)
}

export function createOutbound(data: CreateOutboundReq) {
  return postResponse<OutboundOrder>('zzz-goodser/legacy/createOutbound', data)
}

export function confirmOutbound(data: IdReq) {
  return postResponse<OutboundOrder>('zzz-goodser/legacy/confirmOutbound', data)
}

export function cancelOutbound(data: IdReq) {
  return postResponse<OutboundOrder>('zzz-goodser/legacy/cancelOutbound', data)
}

export function cancelReserve(data: IdReq) {
  return postResponse<OutboundOrder>('zzz-goodser/legacy/cancelReserve', data)
}

export function reserveToOutbound(data: ReserveToOutboundReq) {
  return postResponse<OutboundOrder>('zzz-goodser/legacy/reserveToOutbound', data)
}

// Returns
export function createReturn(inventoryId: string, outboundOrderId: string, data: CreateReturnReq) {
  return postResponse<ReturnOrder>(
    `zzz-goodser/inventories/${inventoryId}/outbound-orders/${outboundOrderId}/returns`,
    data,
  )
}

export function loadReturns(inventoryId: string, outboundOrderId?: string) {
  return getResponse<ReturnOrder[]>(
    `zzz-goodser/inventories/${inventoryId}/returns`,
    outboundOrderId ? { outbound_order_id: outboundOrderId } : undefined,
  )
}

export function confirmReturn(inventoryId: string, returnId: string) {
  return postResponse<ReturnOrder>(`zzz-goodser/inventories/${inventoryId}/returns/${returnId}/confirm`)
}

export function cancelReturn(inventoryId: string, returnId: string) {
  return postResponse<ReturnOrder>(`zzz-goodser/inventories/${inventoryId}/returns/${returnId}/cancel`)
}

// Tags
export function loadTags() {
  return postResponse<GoodserTag[]>('zzz-goodser/legacy/loadTags')
}

export function createTag(data: CreateTagReq) {
  return postResponse<GoodserTag>('zzz-goodser/legacy/createTag', data)
}

export function updateTag(data: UpdateTagReq) {
  return postResponse<GoodserTag>('zzz-goodser/legacy/updateTag', data)
}

export function deleteTag(data: IdReq) {
  return postResponse<any>('zzz-goodser/legacy/deleteTag', data)
}

// Status Codes
export function loadStatusCodes() {
  return postResponse<StatusCode[]>('zzz-goodser/legacy/loadStatusCodes')
}

export function addStatusCode(data: AddStatusCodeReq) {
  return postResponse<StatusCode>('zzz-goodser/legacy/addStatusCode', data)
}

export function updateStatusCode(data: UpdateStatusCodeReq) {
  return postResponse<StatusCode>('zzz-goodser/legacy/updateStatusCode', data)
}

export function removeStatusCode(data: IdReq) {
  return postResponse<any>('zzz-goodser/legacy/removeStatusCode', data)
}

// ---- P1: 受控维度字典 ----
export function loadDictionaries(kind?: DictionaryKind, enabled?: boolean) {
  const params: Record<string, any> = {}
  if (kind) params.kind = kind
  if (enabled !== undefined) params.enabled = enabled
  return getResponse<{ items: Dictionary[] }>('zzz-goodser/settings/dictionaries', params)
}

export function createDictionary(data: CreateDictionaryReq) {
  return postResponse<Dictionary>('zzz-goodser/settings/dictionaries', data)
}

export function updateDictionary(data: UpdateDictionaryReq) {
  return putResponse<Dictionary>(`zzz-goodser/settings/dictionaries/${data.id}`, data)
}

export function deleteDictionary(id: string) {
  return deleteResponse<any>(`zzz-goodser/settings/dictionaries/${id}`)
}

// ---- P1: 系列聚合视图 ----
export function loadSeriesSummary(inventoryId: string) {
  return getResponse<{ items: SeriesSummary[] }>(`zzz-goodser/inventories/${inventoryId}/series`)
}

// ---- P1: 组合包 ----
export function loadCombos(inventoryId: string, status?: 'active' | 'inactive') {
  return getResponse<{ items: Combo[] }>(
    `zzz-goodser/inventories/${inventoryId}/combos`,
    status ? { status } : undefined,
  )
}

export function getCombo(comboId: string) {
  return getResponse<Combo>(`zzz-goodser/combos/${comboId}`)
}

export function createCombo(data: CreateComboReq) {
  return postResponse<Combo>(`zzz-goodser/inventories/${data.inventory_id}/combos`, data)
}

export function updateCombo(data: UpdateComboReq) {
  return putResponse<Combo>(`zzz-goodser/combos/${data.id}`, data)
}

export function deleteCombo(comboId: string) {
  return deleteResponse<any>(`zzz-goodser/combos/${comboId}`)
}

// ---- P1.5: 捆 ----
export function loadBundles(inventoryId: string, status?: 'active' | 'inactive') {
  return getResponse<{ items: Bundle[] }>(
    `zzz-goodser/inventories/${inventoryId}/bundles`,
    status ? { status } : undefined,
  )
}

export function getBundle(bundleId: string) {
  return getResponse<Bundle>(`zzz-goodser/bundles/${bundleId}`)
}

export function createBundle(data: CreateBundleReq) {
  return postResponse<Bundle>(`zzz-goodser/inventories/${data.inventory_id}/bundles`, data)
}

export function updateBundle(data: UpdateBundleReq) {
  return putResponse<Bundle>(`zzz-goodser/bundles/${data.id}`, data)
}

export function deleteBundle(bundleId: string) {
  return deleteResponse<any>(`zzz-goodser/bundles/${bundleId}`)
}

export function loadBundleMainProducts(bundleId: string, keyword?: string) {
  return getResponse<{ items: BundleMainProduct[] }>(
    `zzz-goodser/bundles/${bundleId}/main-products`,
    keyword ? { keyword } : undefined,
  )
}

export function loadBundleSubProducts(
  bundleId: string,
  params?: { keyword?: string; only_available?: boolean },
) {
  return getResponse<{ items: BundleSubProduct[] }>(
    `zzz-goodser/bundles/${bundleId}/sub-products`,
    params,
  )
}

export function previewBundle(bundleId: string, data: BundlePreviewReq) {
  return postResponse<BundlePreviewResp>(`zzz-goodser/bundles/${bundleId}/preview`, data)
}

// ---- P1.5: 统计 ----
export function getInventoryStats(
  inventoryId: string,
  options: number | { days?: number; startDate?: string; endDate?: string } = 30,
) {
  const params =
    typeof options === 'number'
      ? { days: options }
      : {
          days: options.days,
          start_date: options.startDate,
          end_date: options.endDate,
        }
  return getResponse<StatsOverview>(`zzz-goodser/inventories/${inventoryId}/stats`, params)
}

// ---- 图片上传 ----
export function uploadProductImage(file: File): Promise<ApiResponse<{ url: string }>> {
  const form = new FormData()
  form.append('image', file)
  return request
    .post<ApiResponse<{ url: string }>>('zzz-goodser/legacy/uploadImage', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}
