<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">{{ statsRangeLabel }}</span>
      <div class="goodser__stats-controls">
        <NkSelect
          v-if="inventories.length"
          :model-value="inventoryId"
          :options="inventoryOptions"
          style="width: 200px"
          size="sm"
          @update:model-value="emit('update:inventoryId', $event)"
        />
        <NkSelect
          v-model="statsDays"
          :options="statsDayOptions"
          style="width: 120px"
          size="sm"
        />
        <NkButton size="sm" variant="ghost" @click="fetchStats">刷新</NkButton>
        <NkButton size="sm" variant="ghost" :disabled="!stats" @click="exportStatsCSV">导出 CSV</NkButton>
      </div>
    </div>
    <NkLoading v-if="loadingStats" />
    <div v-else-if="!stats" class="goodser__empty">
      <NkEmpty description="暂无统计数据" />
    </div>
    <template v-else>
      <div class="goodser__stat-grid">
        <NkCard class="goodser__stat-card">
          <div class="goodser__stat-label">商品数</div>
          <div class="goodser__stat-value">{{ stats.stock.total_products }}</div>
          <div class="goodser__stat-hint">缺货 {{ stats.stock.out_of_stock }} 件</div>
        </NkCard>
        <NkCard class="goodser__stat-card">
          <div class="goodser__stat-label">可售库存</div>
          <div class="goodser__stat-value">{{ stats.stock.available }}</div>
          <div class="goodser__stat-hint">已锁定 {{ stats.stock.reserved }}</div>
        </NkCard>
        <NkCard class="goodser__stat-card">
          <div class="goodser__stat-label">库存总量</div>
          <div class="goodser__stat-value">{{ stats.stock.total }}</div>
          <div class="goodser__stat-hint">可售 + 锁定</div>
        </NkCard>
        <NkCard class="goodser__stat-card">
          <div class="goodser__stat-label">库存总值</div>
          <div class="goodser__stat-value">¥{{ stats.stock.stock_value.toFixed(2) }}</div>
          <div class="goodser__stat-hint">按预期价 / 市场价</div>
        </NkCard>
      </div>

      <div class="goodser__stat-panels">
        <NkCard class="goodser__stat-panel">
          <div class="goodser__stat-panel-title">订单与退货（近 {{ stats.days }} 天）</div>
          <div class="goodser__stat-kv"><span>待确认出库</span><strong>{{ stats.orders.pending_outbound }}</strong></div>
          <div class="goodser__stat-kv"><span>已确认出库</span><strong>{{ stats.orders.confirmed_outbound }}</strong></div>
          <div class="goodser__stat-kv"><span>已取消出库</span><strong>{{ stats.orders.cancelled_outbound }}</strong></div>
          <div class="goodser__stat-kv"><span>待处理预留</span><strong>{{ stats.orders.pending_reserves }}</strong></div>
          <div class="goodser__stat-kv"><span>待确认退货</span><strong>{{ stats.orders.pending_returns }}</strong></div>
          <div class="goodser__stat-kv"><span>已确认退货</span><strong>{{ stats.orders.confirmed_returns }}</strong></div>
        </NkCard>
        <NkCard class="goodser__stat-panel">
          <div class="goodser__stat-panel-title">热销商品（按确认出库量）</div>
          <NkEmpty v-if="!stats.top_products.length" description="区间内暂无出库记录" />
          <div v-for="(p, i) in stats.top_products" :key="p.product_id" class="goodser__stat-rank">
            <span class="goodser__stat-rank-index">{{ i + 1 }}</span>
            <span class="goodser__stat-rank-name">{{ p.product_name || p.product_code }}</span>
            <strong>{{ p.outbound_quantity }}</strong>
          </div>
        </NkCard>
      </div>

      <NkCard class="goodser__stat-panel">
        <div class="goodser__stat-panel-title">出库 / 退货趋势</div>
        <div class="goodser__stat-legend">
          <span><i class="goodser__stat-dot goodser__stat-dot--out"></i>出库</span>
          <span><i class="goodser__stat-dot goodser__stat-dot--ret"></i>退货回库</span>
          <span class="goodser__stat-legend-hint">点击柱子查看单日明细</span>
        </div>
        <div class="goodser__stat-trend">
          <div
            v-for="p in stats.trend"
            :key="p.date"
            class="goodser__stat-trend-col"
            :class="{ 'goodser__stat-trend-col--active': p.date === selectedTrendDate }"
            @click="selectTrendPoint(p.date)"
          >
            <div class="goodser__stat-trend-bars">
              <div
                class="goodser__stat-bar goodser__stat-bar--out"
                :style="{ height: trendHeight(p.outbound_quantity) + 'px' }"
                :title="`${p.date} 出库 ${p.outbound_quantity}`"
              ></div>
              <div
                class="goodser__stat-bar goodser__stat-bar--ret"
                :style="{ height: trendHeight(p.return_quantity) + 'px' }"
                :title="`${p.date} 退货 ${p.return_quantity}`"
              ></div>
            </div>
            <span class="goodser__stat-trend-label">{{ p.date.slice(5) }}</span>
          </div>
        </div>
        <div v-if="selectedTrendPoint" class="goodser__stat-trend-detail">
          <div class="goodser__stat-trend-detail-head">
            <strong>{{ selectedTrendPoint.date }}</strong>
            <span>净变化 {{ selectedTrendPoint.outbound_quantity - selectedTrendPoint.return_quantity }}</span>
          </div>
          <div class="goodser__stat-kv"><span>出库数量</span><strong>{{ selectedTrendPoint.outbound_quantity }}</strong></div>
          <div class="goodser__stat-kv"><span>退货回库</span><strong>{{ selectedTrendPoint.return_quantity }}</strong></div>
        </div>
      </NkCard>

      <NkCard class="goodser__stat-panel">
        <div class="goodser__stat-panel-title">系列分布</div>
        <NkEmpty v-if="!stats.series.length" description="暂无系列数据" />
        <div v-for="row in stats.series" :key="row.series_id || row.series_name" class="goodser__stat-series">
          <div class="goodser__stat-series-head">
            <span>{{ row.series_name }}</span>
            <span>{{ row.product_count }} 件 / 可售 {{ row.available }}</span>
          </div>
          <div class="goodser__stat-series-bar">
            <div class="goodser__stat-series-fill" :style="{ width: seriesWidth(row.total) }"></div>
          </div>
          <div class="goodser__stat-series-meta">
            <span>总量 {{ row.total }}（锁定 {{ row.reserved }}）</span>
            <span>¥{{ row.stock_value.toFixed(2) }}</span>
          </div>
        </div>
      </NkCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { getInventoryStats } from '@/api/goodser'
import type { Inventory, StatsOverview } from '@/types/goodser'
import { formatDate } from '../utils'

const props = defineProps<{
  inventoryId: string
  inventories: Inventory[]
}>()

const emit = defineEmits<{
  (e: 'update:inventoryId', value: string): void
}>()

const stats = ref<StatsOverview | null>(null)
const loadingStats = ref(false)
const statsDays = ref(30)
const statsDayOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
  { label: '近 365 天', value: 365 },
]
const selectedTrendDate = ref('')
let requestSeq = 0

const inventoryOptions = computed(() =>
  props.inventories.map((inv) => ({ label: inv.name, value: inv._id })),
)
const statsRangeLabel = computed(() => {
  if (!stats.value) return `统计区间：近 ${statsDays.value} 天`
  return `${stats.value.inventory_name}｜近 ${stats.value.days} 天｜更新于 ${formatDate(stats.value.generated_at)}`
})
const statsMaxTrend = computed(() => {
  if (!stats.value) return 1
  return Math.max(1, ...stats.value.trend.map((p) => Math.max(p.outbound_quantity, p.return_quantity)))
})
const statsMaxSeries = computed(() => {
  if (!stats.value) return 1
  return Math.max(1, ...stats.value.series.map((row) => row.total))
})
const selectedTrendPoint = computed(() => {
  if (!stats.value) return null
  return stats.value.trend.find((p) => p.date === selectedTrendDate.value) || null
})

function selectTrendPoint(date: string) {
  selectedTrendDate.value = date
}

function trendHeight(value: number) {
  if (!value) return 2
  return Math.max(4, Math.round((value / statsMaxTrend.value) * 100))
}

function seriesWidth(total: number) {
  return `${Math.max(total ? 4 : 0, Math.round((total / statsMaxSeries.value) * 100))}%`
}

async function fetchStats() {
  if (!props.inventoryId) return
  const seq = ++requestSeq
  loadingStats.value = true
  try {
    const res = await getInventoryStats(props.inventoryId, statsDays.value)
    if (seq !== requestSeq) return
    stats.value = res.data || null
    const trend = stats.value?.trend || []
    const latest = [...trend].reverse().find((p) => p.outbound_quantity || p.return_quantity) || trend[trend.length - 1]
    selectedTrendDate.value = latest?.date || ''
  } catch (err: any) {
    if (seq !== requestSeq) return
    NKMessage.error(err?.message || '加载统计失败')
  } finally {
    if (seq === requestSeq) loadingStats.value = false
  }
}

function exportStatsCSV() {
  const value = stats.value
  if (!value) return
  const rows: string[][] = []
  const push = (...cells: Array<string | number>) => rows.push(cells.map((cell) => String(cell)))
  push('统计区间', `近 ${value.days} 天`)
  push('生成时间', formatDate(value.generated_at))
  push('')
  push('库存指标', '数值')
  push('商品数', value.stock.total_products)
  push('可售库存', value.stock.available)
  push('已锁定', value.stock.reserved)
  push('库存总量', value.stock.total)
  push('库存总值', value.stock.stock_value)
  push('缺货商品数', value.stock.out_of_stock)
  push('')
  push('订单与退货', '数量')
  push('待确认出库', value.orders.pending_outbound)
  push('已确认出库', value.orders.confirmed_outbound)
  push('已取消出库', value.orders.cancelled_outbound)
  push('待处理预留', value.orders.pending_reserves)
  push('待确认退货', value.orders.pending_returns)
  push('已确认退货', value.orders.confirmed_returns)
  push('')
  push('日期', '出库数量', '退货回库', '净变化')
  value.trend.forEach((p) => push(p.date, p.outbound_quantity, p.return_quantity, p.outbound_quantity - p.return_quantity))
  push('')
  push('系列', '商品数', '可售', '锁定', '总量', '库存价值')
  value.series.forEach((row) => push(row.series_name, row.product_count, row.available, row.reserved, row.total, row.stock_value))
  push('')
  push('商品', '编码', '确认出库量')
  value.top_products.forEach((p) => push(p.product_name || p.product_code, p.product_code, p.outbound_quantity))

  const escape = (text: string) => `"${text.replace(/"/g, '""')}"`
  const csv = '\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${value.inventory_name}-统计-${value.days}天.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

watch([() => props.inventoryId, statsDays], fetchStats, { immediate: true })
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__stats-controls {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    flex-wrap: wrap;
  }

  &__stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
  }

  &__stat-card {
    padding: $nk-spacing-md;
  }

  &__stat-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__stat-value {
    margin-top: 6px;
    font-size: 26px;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__stat-hint {
    margin-top: 4px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }

  &__stat-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
    }
  }

  &__stat-panel {
    padding: $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
  }

  &__stat-panel-title {
    margin-bottom: $nk-spacing-sm;
    font-size: $nk-font-size-base;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-800;
  }

  &__stat-kv {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    border-bottom: 1px dashed $nk-color-neutral-100;

    strong {
      color: $nk-color-neutral-900;
    }
  }

  &__stat-rank {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 6px 0;
    font-size: $nk-font-size-sm;
  }

  &__stat-rank-index {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $nk-color-neutral-100;
    color: $nk-color-neutral-600;
    font-size: $nk-font-size-xs;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__stat-rank-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__stat-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-sm;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__stat-legend-hint {
    margin-left: auto;
    color: $nk-color-primary-600;
  }

  &__stat-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-radius: 2px;

    &--out {
      background: #1677ff;
    }

    &--ret {
      background: #52c41a;
    }
  }

  &__stat-trend {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 140px;
    padding: 0 2px;
    overflow-x: auto;
  }

  &__stat-trend-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 22px;
    flex: 1;
    padding: 4px 2px;
    border-radius: $nk-radius-sm;
    cursor: pointer;
    transition: background $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-50;
    }

    &--active {
      background: $nk-color-neutral-100;
    }
  }

  &__stat-trend-bars {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 110px;
  }

  &__stat-bar {
    width: 7px;
    min-height: 2px;
    border-radius: 2px 2px 0 0;

    &--out {
      background: #1677ff;
    }

    &--ret {
      background: #52c41a;
    }
  }

  &__stat-trend-label {
    font-size: 10px;
    color: $nk-color-neutral-400;
    white-space: nowrap;
  }

  &__stat-trend-detail {
    margin-top: $nk-spacing-sm;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-100;
  }

  &__stat-trend-detail-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: $nk-font-size-sm;

    span {
      color: $nk-color-neutral-500;
      font-size: $nk-font-size-xs;
    }
  }

  &__stat-series {
    padding: $nk-spacing-sm 0;
    border-bottom: 1px dashed $nk-color-neutral-100;

    &:last-child {
      border-bottom: none;
    }
  }

  &__stat-series-head,
  &__stat-series-meta {
    display: flex;
    justify-content: space-between;
    gap: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
  }

  &__stat-series-meta {
    margin-top: 4px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }

  &__stat-series-bar {
    height: 6px;
    margin-top: 6px;
    border-radius: 3px;
    background: $nk-color-neutral-100;
    overflow: hidden;
  }

  &__stat-series-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, #1677ff, #69b1ff);
  }
}
</style>
