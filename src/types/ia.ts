export interface Account {
  id: string
  name: string
  type: string
  broker: string
  currency: string
  cost_method: string
  status: string
  remark: string
  created_at: string
  updated_at: string
}

export interface CreateAccountReq {
  name: string
  type: string
  broker?: string
  currency?: string
  cost_method?: string
  remark?: string
}

export interface UpdateAccountReq {
  name?: string
  type?: string
  broker?: string
  currency?: string
  cost_method?: string
  status?: string
  remark?: string
}

export interface AccountSummary {
  total_cost: number
  total_value: number
  total_pnl: number
  pnl_ratio: number
  realized_pnl: number
  dividend_income: number
  interest_income: number
  fee_total: number
  cash_balance: number
}

export interface OverviewResp {
  accounts: Record<string, AccountSummary>
  grand: AccountSummary & {
    total_value_cny: number
    by_currency: Record<string, AccountSummary>
  }
}

export interface AssetInfo {
  code: string
  name: string
  asset_type: string
  market: string
  currency?: string
  exchange?: string
  sector?: string
}

export interface Asset {
  id: string
  code: string
  name: string
  asset_type: string
  market: string
  sub_type: string
  issuer: string
  currency: string
  risk_level: string
  status: string
  annual_rate: number
  lock_days: number
  start_date: string
  maturity_date: string
  tracking_index: string
  remark: string
  created_at: string
  updated_at: string
}

export interface CreateAssetReq {
  code: string
  name: string
  asset_type: string
  market: string
  sub_type?: string
  issuer?: string
  currency?: string
  risk_level?: string
  annual_rate?: number
  lock_days?: number
  start_date?: string
  maturity_date?: string
  tracking_index?: string
  remark?: string
}

export interface UpdateAssetReq {
  code?: string
  name?: string
  asset_type?: string
  market?: string
  sub_type?: string
  issuer?: string
  currency?: string
  risk_level?: string
  status?: string
  annual_rate?: number
  lock_days?: number
  start_date?: string
  maturity_date?: string
  tracking_index?: string
  remark?: string
}

export interface AssetResolveResp {
  code: string
  name: string
  market: string
  currency: string
  asset_type: string
  price: number
  change_pct: number
  change_amt: number
  prev_close: number
  open: number
  high: number
  low: number
  volume: number
  turnover: number
  turnover_rate: number
  high_limit: number
  low_limit: number
  pe: number
  pe_dynamic: number
  total_mv_yi: number
  float_mv_yi: number
}

export interface Position {
  id: number
  account_id: string
  asset_id: string
  shares: number
  avg_cost: number
  cost_amount: number
  last_price: number
  target_price: number
  stop_loss_price: number
  pnl_ratio: number
  market_value: number
  unrealized_pnl: number
  asset: AssetInfo
}

export interface Transaction {
  id: number
  account_id: string
  asset_id: string
  trade_type: string
  shares: number
  price: number
  amount: number
  fee: number
  tax: number
  trade_at: string
  status: string
  realized_pnl: number
  settle_date?: string
  remark?: string
  asset?: AssetInfo
}

export interface CreateTransactionReq {
  account_id: string
  asset_id: string
  trade_type: string
  shares?: number
  price?: number
  amount?: number
  fee?: number
  tax?: number
  trade_at?: string
  settle_date?: string
  remark?: string
  target_price?: number
  stop_loss_price?: number
}

export interface TradeAdviceItem {
  account_id: string
  asset_id: string
  code: string
  name: string
  asset_type: string
  action: 'buy' | 'hold' | 'watch' | 'reduce' | 'sell'
  confidence: number
  reasons: string[]
  cost_price: number
  last_price: number
  pnl_ratio: number
  target_price: number
  stop_loss_price: number
  target_progress: number
  above_ma20: boolean
  above_ma60: boolean
  maturity_days: number
}

export interface TradeAdviceResp {
  scope: string
  generated_at: string
  buy_count: number
  hold_count: number
  reduce_count: number
  sell_count: number
  items: TradeAdviceItem[]
}

export interface SetPositionTargetReq {
  account_id: string
  asset_id: string
  target_price: number
  stop_loss_price: number
}

export interface ConcentrationItem {
  code: string
  name: string
  weight: number
  breach: boolean
}

export interface RiskMetricsResp {
  max_drawdown: number
  mdd_peak_date: string
  mdd_trough_date: string
  annual_volatility: number
  top1_weight: number
  top5_weight: number
  hhi: number
  concentration: ConcentrationItem[]
}

export interface EquityCurvePoint {
  date: string
  value: number
  cost: number
  pnl: number
  pnl_ratio: number
}

export interface BenchmarkPoint {
  date: string
  index: number
}

export interface EquityCurveResp {
  points: EquityCurvePoint[]
  benchmark_name: string
  benchmark: BenchmarkPoint[]
}

export interface ReturnsResp {
  simple_return: number
  modified_dietz: number
  xirr?: number
  period_start: string
  period_end: string
}

export interface TradesReviewResp {
  total_trades: number
  win_trades: number
  loss_trades: number
  avg_holding_days: number
  items: TradeReviewItem[]
}

export interface TradeReviewItem {
  code: string
  name: string
  action: string
  shares: number
  price: number
  amount: number
  pnl: number
  pnl_ratio: number
  holding_days: number
  trade_at: string
}

export interface PriceAlert {
  id: string
  asset_id: string
  alert_type: string
  target_price: number
  status: string
  triggered_at: string
  triggered_price: number
  asset?: AssetInfo
}

export interface CreateAlertReq {
  account_id: string
  asset_id: string
  alert_type: string
  target_price: number
  note?: string
}

export interface UpdateAlertReq {
  target_price?: number
  status?: string
  note?: string
}

export interface ScreenItem {
  code: string
  name: string
  price: number
  change_pct: number
  score: number
  score_parts: {
    momentum?: number
    trend?: number
    funds?: number
    low_vol?: number
    roe?: number
    growth?: number
    cheap_pe?: number
    cheap_pb?: number
    size?: number
  }
  r5?: number
  r20?: number
  r60?: number
  above_ma20?: boolean
  above_ma60?: boolean
  vol_annual?: number
  pe_ttm?: number
  pe_dynamic?: number
  pb?: number
  roe?: number
  profit_growth?: number
  total_mv_yi?: number
}

export interface DynamicPotentialResp {
  generated_at: string
  universe: number
  analyzed: number
  items: ScreenItem[]
}

export interface QualityStockResp {
  generated_at: string
  universe: number
  filtered: number
  items: ScreenItem[]
}

export interface IndexAnalysisItem {
  secid: string
  name: string
  latest: number
  change_ytd: number
  ma20: number
  ma60: number
  ma120: number
  ma250: number
  trend: string
  above_ma20: boolean
  above_ma60: boolean
  above_ma120?: boolean
  above_ma250?: boolean
  percentile: number
  ann_return: number
  ann_vol: number
  max_drawdown: number
  samples?: number
  window_high?: number
  window_low?: number
  error?: string
}

export interface IndexAnalysisResp {
  items: IndexAnalysisItem[]
}

export interface ImportResult {
  total_rows: number
  created: number
  duplicates: number
  failed: number
  assets_added: string[]
  errors: string[]
}

export interface DcaPlan {
  id: string
  account_id: string
  asset_id: string
  name: string
  amount: number
  cycle: string
  exec_day: number
  start_date: string
  end_date: string
  auto_buy: boolean
  next_exec_date: string
  enabled: boolean
  status: string
  remark: string
  created_at: string
  asset?: AssetInfo
}

export interface CreateDcaPlanReq {
  account_id: string
  asset_id: string
  name: string
  amount: number
  cycle: string
  exec_day: number
  start_date?: string
  end_date?: string
  auto_buy?: boolean
  remark?: string
}

export interface UpdateDcaPlanReq {
  name?: string
  amount?: number
  cycle?: string
  exec_day?: number
  start_date?: string
  end_date?: string
  auto_buy?: boolean
  status?: string
  remark?: string
}

export interface CashFlow {
  id: number
  account_id: string
  counter_account_id: string
  flow_type: string
  amount: number
  currency: string
  flow_date: string
  remark: string
  created_at: string
}

export interface CreateCashFlowReq {
  account_id: string
  amount: number
  flow_type: string
  counter_account_id?: string
  currency?: string
  flow_date?: string
  remark?: string
}

export interface AllocationItem {
  id: string
  account_id: string
  category: string
  target_ratio: number
  tolerance: number
  status: string
  remark: string
  created_at: string
  updated_at: string
}

export interface CreateAllocationReq {
  category: string
  target_ratio: number
  account_id?: string
  tolerance?: number
  remark?: string
}

export interface UpdateAllocationReq {
  target_ratio?: number
  tolerance?: number
  status?: string
  remark?: string
}

export interface AllocationReviewItem {
  category: string
  target_ratio: number
  actual_ratio: number
  deviation: number
  tolerance: number
  breach: boolean
  status: string
}

export interface AllocationReviewResp {
  account_id: string
  items: AllocationReviewItem[]
  uncovered: string[]
}

export interface FeeRecord {
  id: number
  account_id: string
  asset_id: string
  fee_type: string
  amount: number
  currency: string
  period: string
  charge_date: string
  remark: string
  created_at: string
}

export interface CreateFeeReq {
  account_id: string
  amount: number
  fee_type: string
  asset_id?: string
  currency?: string
  period?: string
  charge_date?: string
  remark?: string
}

export interface FxRate {
  id: number
  base_ccy: string
  quote_ccy: string
  rate: number
  rate_date: string
  source: string
}

export interface UpsertFxRateReq {
  base_ccy: string
  quote_ccy: string
  rate: number
  rate_date?: string
  source?: string
}

export interface PriceHistory {
  asset_id: string
  nav: number
  nav_date: string
  source: string
}

export interface RefreshResult {
  scanned: number
  updated: number
  failed: number
  errors: string[]
}

export interface AccrueResult {
  scanned: number
  accrued: number
  skipped: number
  total_interest: number
  errors: string[]
}

export interface AlertCheckResult {
  checked: number
  triggered: number
  notified: boolean
  items: any[]
}

export interface MaturityCheckResult {
  count: number
  within_days: number
  notified: boolean
  items: any[]
}

export interface FxRefreshResult {
  updated: string[]
  rates: Record<string, number>
  errors: string[]
}

export interface SnapshotResult {
  date: string
  accounts: number
  failed: number
}

export interface DividendReportResp {
  scope: string
  total_gross: number
  total_net: number
  total_tax: number
  yield_on_cost: number
  reinvest_count: number
  by_asset: any[]
}

export interface FeesReportResp {
  scope: string
  start_date: string
  end_date: string
  grand: number
  total_trade_fees: number
  total_trade_tax: number
  total_standalone: number
  standalone_by_type: Record<string, number>
  by_year: any[]
  base_value: number
  drag_ratio: number
}

export interface DcaSimulateResp {
  asset_id: string
  cycle: string
  start_date: string
  end_date: string
  total_invested: number
  shares_accum: number
  final_nav: number
  final_value: number
  return_rate: number
  lump_sum_value: number
  lump_return_rate: number
  advantage: number
  exec_count: number
}

export interface PaginatedResp<T> {
  items: T[]
  has_more: boolean
  total: number
}
