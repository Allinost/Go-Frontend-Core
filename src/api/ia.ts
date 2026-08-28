import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type { ApiResponse } from '@/types/api'
import type {
  OverviewResp,
  Account,
  CreateAccountReq,
  UpdateAccountReq,
  Asset,
  CreateAssetReq,
  UpdateAssetReq,
  AssetResolveResp,
  Position,
  Transaction,
  CreateTransactionReq,
  TradeAdviceResp,
  SetPositionTargetReq,
  RiskMetricsResp,
  EquityCurveResp,
  ReturnsResp,
  TradesReviewResp,
  PriceAlert,
  CreateAlertReq,
  UpdateAlertReq,
  ScreenItem,
  DynamicPotentialResp,
  QualityStockResp,
  IndexAnalysisResp,
  ImportResult,
  DcaPlan,
  CreateDcaPlanReq,
  UpdateDcaPlanReq,
  CashFlow,
  CreateCashFlowReq,
  AllocationItem,
  CreateAllocationReq,
  UpdateAllocationReq,
  AllocationReviewResp,
  FeeRecord,
  CreateFeeReq,
  FxRate,
  UpsertFxRateReq,
  PriceHistory,
  RefreshResult,
  AccrueResult,
  AlertCheckResult,
  MaturityCheckResult,
  FxRefreshResult,
  SnapshotResult,
  DividendReportResp,
  FeesReportResp,
  DcaSimulateResp,
  PaginatedResp,
} from '@/types/ia'

// ==================== Accounts ====================
export function listAccounts(params?: {
  page?: number
  page_size?: number
  type?: string
  status?: string
  keyword?: string
}): Promise<ApiResponse<PaginatedResp<Account>>> {
  return getResponse('/zzz-ia/accounts', params)
}

export function createAccount(data: CreateAccountReq): Promise<ApiResponse<Account>> {
  return postResponse('/zzz-ia/accounts', data)
}

export function getAccount(id: string): Promise<ApiResponse<Account>> {
  return getResponse(`/zzz-ia/accounts/${id}`)
}

export function updateAccount(id: string, data: UpdateAccountReq): Promise<ApiResponse<Account>> {
  return putResponse(`/zzz-ia/accounts/${id}`, data)
}

export function deleteAccount(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/accounts/${id}`)
}

// ==================== Assets ====================
export function listAssets(params?: {
  asset_type?: string
  market?: string
  status?: string
  keyword?: string
  page?: number
  page_size?: number
}): Promise<ApiResponse<PaginatedResp<Asset>>> {
  return getResponse('/zzz-ia/assets', params)
}

export function resolveAsset(params: {
  code: string
  market?: string
}): Promise<ApiResponse<AssetResolveResp>> {
  return getResponse('/zzz-ia/assets/resolve', params)
}

export function createAsset(data: CreateAssetReq): Promise<ApiResponse<Asset>> {
  return postResponse('/zzz-ia/assets', data)
}

export function getAsset(id: string): Promise<ApiResponse<Asset>> {
  return getResponse(`/zzz-ia/assets/${id}`)
}

export function updateAsset(id: string, data: UpdateAssetReq): Promise<ApiResponse<Asset>> {
  return putResponse(`/zzz-ia/assets/${id}`, data)
}

export function deleteAsset(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/assets/${id}`)
}

// ==================== Positions ====================
export function listPositions(params?: {
  account_id?: string
  asset_type?: string
  status?: string
}): Promise<ApiResponse<Position[]>> {
  return getResponse('/zzz-ia/positions', params)
}

export function setPositionTarget(data: SetPositionTargetReq): Promise<ApiResponse<void>> {
  return postResponse('/zzz-ia/positions/target', data)
}

export function updatePositionValuation(data: {
  account_id: string
  asset_id: string
  price: number
}): Promise<ApiResponse<void>> {
  return putResponse('/zzz-ia/positions/valuation', data)
}

// ==================== Transactions ====================
export function listTransactions(params?: {
  page?: number
  page_size?: number
  account_id?: string
  asset_id?: string
  trade_type?: string
  status?: string
  start?: string
  end?: string
}): Promise<ApiResponse<PaginatedResp<Transaction>>> {
  return getResponse('/zzz-ia/transactions', params)
}

export function createTransaction(data: CreateTransactionReq): Promise<ApiResponse<Transaction>> {
  return postResponse('/zzz-ia/transactions', data)
}

export function getTransaction(id: number): Promise<ApiResponse<Transaction>> {
  return getResponse(`/zzz-ia/transactions/${id}`)
}

export function confirmTransaction(id: number): Promise<ApiResponse<Transaction>> {
  return postResponse(`/zzz-ia/transactions/${id}/confirm`)
}

export function deleteTransaction(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/transactions/${id}`)
}

// ==================== Cash Flows ====================
export function listCashFlows(params?: {
  account_id?: string
  flow_type?: string
  start?: string
  end?: string
}): Promise<ApiResponse<CashFlow[]>> {
  return getResponse('/zzz-ia/cash-flows', params)
}

export function createCashFlow(data: CreateCashFlowReq): Promise<ApiResponse<CashFlow>> {
  return postResponse('/zzz-ia/cash-flows', data)
}

export function deleteCashFlow(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/cash-flows/${id}`)
}

// ==================== Allocations ====================
export function listAllocations(params?: {
  account_id?: string
}): Promise<ApiResponse<AllocationItem[]>> {
  return getResponse('/zzz-ia/allocations', params)
}

export function createAllocation(data: CreateAllocationReq): Promise<ApiResponse<AllocationItem>> {
  return postResponse('/zzz-ia/allocations', data)
}

export function updateAllocation(id: string, data: UpdateAllocationReq): Promise<ApiResponse<AllocationItem>> {
  return putResponse(`/zzz-ia/allocations/${id}`, data)
}

export function deleteAllocation(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/allocations/${id}`)
}

export function getAllocationReview(params?: {
  account_id?: string
}): Promise<ApiResponse<AllocationReviewResp>> {
  return getResponse('/zzz-ia/allocations/review', params)
}

// ==================== Fees ====================
export function listFees(params?: {
  account_id?: string
  fee_type?: string
  start?: string
  end?: string
}): Promise<ApiResponse<FeeRecord[]>> {
  return getResponse('/zzz-ia/fees', params)
}

export function createFee(data: CreateFeeReq): Promise<ApiResponse<FeeRecord>> {
  return postResponse('/zzz-ia/fees', data)
}

export function deleteFee(id: number): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/fees/${id}`)
}

// ==================== FX Rates ====================
export function listFxRates(params?: {
  base_ccy?: string
  quote_ccy?: string
}): Promise<ApiResponse<FxRate[]>> {
  return getResponse('/zzz-ia/fx-rates', params)
}

export function upsertFxRate(data: UpsertFxRateReq): Promise<ApiResponse<FxRate>> {
  return putResponse('/zzz-ia/fx-rates', data)
}

// ==================== DCA Plans ====================
export function listDcaPlans(params?: {
  status?: string
}): Promise<ApiResponse<DcaPlan[]>> {
  return getResponse('/zzz-ia/dca-plans', params)
}

export function createDcaPlan(data: CreateDcaPlanReq): Promise<ApiResponse<DcaPlan>> {
  return postResponse('/zzz-ia/dca-plans', data)
}

export function getDcaPlan(id: string): Promise<ApiResponse<DcaPlan>> {
  return getResponse(`/zzz-ia/dca-plans/${id}`)
}

export function updateDcaPlan(id: string, data: UpdateDcaPlanReq): Promise<ApiResponse<DcaPlan>> {
  return putResponse(`/zzz-ia/dca-plans/${id}`, data)
}

export function deleteDcaPlan(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/dca-plans/${id}`)
}

// ==================== Alerts ====================
export function listAlerts(params?: {
  account_id?: string
  asset_id?: string
  status?: string
}): Promise<ApiResponse<PaginatedResp<PriceAlert>>> {
  return getResponse('/zzz-ia/alerts', params)
}

export function createAlert(data: CreateAlertReq): Promise<ApiResponse<PriceAlert>> {
  return postResponse('/zzz-ia/alerts', data)
}

export function getAlert(id: string): Promise<ApiResponse<PriceAlert>> {
  return getResponse(`/zzz-ia/alerts/${id}`)
}

export function updateAlert(id: string, data: UpdateAlertReq): Promise<ApiResponse<PriceAlert>> {
  return putResponse(`/zzz-ia/alerts/${id}`, data)
}

export function deleteAlert(id: string): Promise<ApiResponse<void>> {
  return deleteResponse(`/zzz-ia/alerts/${id}`)
}

// ==================== Analytics ====================
export function getOverview(): Promise<ApiResponse<OverviewResp>> {
  return getResponse('/zzz-ia/overview')
}

export function getAdvice(params?: {
  account_id?: string
}): Promise<ApiResponse<TradeAdviceResp>> {
  return getResponse('/zzz-ia/advice', params)
}

export function getRiskMetrics(params?: {
  account_id?: string
  start?: string
  end?: string
  threshold?: number
}): Promise<ApiResponse<RiskMetricsResp>> {
  return getResponse('/zzz-ia/analytics/risk', params)
}

export function getEquityCurve(params?: {
  account_id?: string
  start?: string
  end?: string
  benchmark?: string
}): Promise<ApiResponse<EquityCurveResp>> {
  return getResponse('/zzz-ia/analytics/equity-curve', params)
}

export function getReturns(params?: {
  account_id?: string
  start?: string
  end?: string
}): Promise<ApiResponse<ReturnsResp>> {
  return getResponse('/zzz-ia/analytics/returns', params)
}

export function getTradesReview(params?: {
  account_id?: string
}): Promise<ApiResponse<TradesReviewResp>> {
  return getResponse('/zzz-ia/analytics/trades-review', params)
}

export function getIndexAnalysis(params?: {
  indexes?: string
  years?: number
}): Promise<ApiResponse<IndexAnalysisResp>> {
  return getResponse('/zzz-ia/analytics/index-analysis', params)
}

export function getDividendReport(params?: {
  account_id?: string
  start?: string
  end?: string
}): Promise<ApiResponse<DividendReportResp>> {
  return getResponse('/zzz-ia/analytics/dividends', params)
}

export function getFeesReport(params?: {
  account_id?: string
  start?: string
  end?: string
}): Promise<ApiResponse<FeesReportResp>> {
  return getResponse('/zzz-ia/analytics/fees', params)
}

export function getDcaSimulate(params: {
  asset_id: string
  cycle: string
  exec_day: number
  amount: number
  start: string
  end?: string
}): Promise<ApiResponse<DcaSimulateResp>> {
  return getResponse('/zzz-ia/analytics/dca-simulate', params)
}

// ==================== Screen ====================
export function listDynamicPotential(params?: {
  top?: number
  pool_size?: number
  pages?: number
}): Promise<ApiResponse<DynamicPotentialResp>> {
  return getResponse('/zzz-ia/screen/dynamic-potential', params)
}

export function listQualityStocks(params?: {
  top?: number
  pages?: number
  min_roe?: number
  max_pe?: number
  max_pb?: number
  min_mv_yi?: number
}): Promise<ApiResponse<QualityStockResp>> {
  return getResponse('/zzz-ia/screen/quality-stocks', params)
}

// ==================== Price History & Quotes ====================
export function listPriceHistory(params: {
  asset_id: string
  limit?: number
}): Promise<ApiResponse<PriceHistory[]>> {
  return getResponse('/zzz-ia/price-history', params)
}

export function searchAssets(params?: {
  keyword?: string
  asset_type?: string
  market?: string
}): Promise<ApiResponse<Asset[]>> {
  return getResponse('/zzz-ia/assets', params)
}

export function refreshQuotes(): Promise<ApiResponse<RefreshResult>> {
  return postResponse('/zzz-ia/quotes/refresh')
}

// ==================== Import ====================
export function importTransactions(data: {
  account_id: string
  csv: string
  auto_create?: boolean
  default_type?: string
}): Promise<ApiResponse<ImportResult>> {
  return postResponse('/zzz-ia/import/transactions', data)
}

// ==================== Tasks ====================
export function runAccrue(): Promise<ApiResponse<AccrueResult>> {
  return postResponse('/zzz-ia/tasks/accrue')
}

export function runCheckAlerts(): Promise<ApiResponse<AlertCheckResult>> {
  return postResponse('/zzz-ia/tasks/check-alerts')
}

export function runCheckRisk(): Promise<ApiResponse<RiskMetricsResp>> {
  return postResponse('/zzz-ia/tasks/check-risk')
}

export function runMaturityCheck(): Promise<ApiResponse<MaturityCheckResult>> {
  return postResponse('/zzz-ia/tasks/maturity-check')
}

export function runRefreshFx(): Promise<ApiResponse<FxRefreshResult>> {
  return postResponse('/zzz-ia/tasks/refresh-fx')
}

export function runSnapshot(): Promise<ApiResponse<SnapshotResult>> {
  return postResponse('/zzz-ia/tasks/snapshot')
}
