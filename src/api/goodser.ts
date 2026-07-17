import { postResponse } from './request'
import type {
  Inventory, CreateInventoryReq, UpdateInventoryReq,
  Product, CreateProductReq, UpdateProductReq, QueryProductsReq, AllocateSeqReq, AllocateSeqResp,
  InboundLog, InboundSingleReq, InboundBatchReq, InboundSearchImportReq,
  CreateInboundLogReq, UpdateInboundLogReq,
  OutboundOrder, CreateOutboundReq, ReserveToOutboundReq,
  GoodserTag, CreateTagReq, UpdateTagReq,
  StatusCode, AddStatusCodeReq, UpdateStatusCodeReq,
  IdReq, PaginatedReq, PaginatedResp, UploadImageResp, SyncAllResp
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
