<template>
  <div class="ia-screen">
    <div class="ia-screen__header">
      <h2 class="ia-screen__title">个股筛选</h2>
    </div>
    <NkTabs v-model="activeTab" :items="tabs" />
    <NkLoading v-if="loading" />
    <div v-else-if="activeTab === 'potential'" class="ia-screen__content">
      <div class="ia-screen__meta">
        <span v-if="potentialMeta">快照池: {{ potentialMeta.universe }} | 入选: {{ potentialMeta.analyzed }} | 生成时间: {{ formatTime(potentialMeta.generated_at) }}</span>
      </div>
      <div class="ia-screen__controls">
        <label>显示数量</label>
        <NkInput v-model.number="potentialTop" type="number" style="width: 80px" />
        <NkButton @click="loadPotential">刷新</NkButton>
      </div>
      <table class="ia-screen__table">
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th class="text-right">现价</th>
            <th class="text-right">涨跌幅</th>
            <th class="text-right">评分</th>
            <th>动量</th>
            <th>趋势</th>
            <th>资金流</th>
            <th class="text-right">5日</th>
            <th class="text-right">20日</th>
            <th class="text-right">60日</th>
            <th class="text-right">年化波动</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in potentialItems" :key="item.code">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td class="text-right">{{ item.price != null ? Number(item.price).toFixed(2) : '-' }}</td>
            <td class="text-right"><PnLBadge :value="(item.change_pct || 0) / 100" /></td>
            <td class="text-right"><span class="ia-screen__score">{{ item.score != null ? Number(item.score).toFixed(2) : '-' }}</span></td>
            <td>{{ formatScore(item.score_parts?.momentum) }}</td>
            <td>{{ formatScore(item.score_parts?.trend) }}</td>
            <td>{{ formatScore(item.score_parts?.funds) }}</td>
            <td class="text-right"><PnLBadge :value="(item.r5 || 0) / 100" /></td>
            <td class="text-right"><PnLBadge :value="(item.r20 || 0) / 100" /></td>
            <td class="text-right"><PnLBadge :value="(item.r60 || 0) / 100" /></td>
            <td class="text-right">{{ item.vol_annual ? (Number(item.vol_annual) * 100).toFixed(1) + '%' : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="ia-screen__content">
      <div class="ia-screen__meta">
        <span v-if="qualityMeta">快照池: {{ qualityMeta.universe }} | 入选: {{ qualityMeta.filtered }} | 生成时间: {{ formatTime(qualityMeta.generated_at) }}</span>
      </div>
      <div class="ia-screen__controls">
        <label>显示数量</label>
        <NkInput v-model.number="qualityTop" type="number" style="width: 80px" />
        <label>最低ROE %</label>
        <NkInput v-model.number="minRoe" type="number" style="width: 80px" />
        <label>最高PE</label>
        <NkInput v-model.number="maxPe" type="number" style="width: 80px" />
        <NkButton @click="loadQuality">刷新</NkButton>
      </div>
      <table class="ia-screen__table">
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th class="text-right">现价</th>
            <th class="text-right">涨跌幅</th>
            <th class="text-right">评分</th>
            <th class="text-right">PE(TTM)</th>
            <th class="text-right">PE(动态)</th>
            <th class="text-right">PB</th>
            <th class="text-right">ROE</th>
            <th class="text-right">利润增速</th>
            <th class="text-right">总市值(亿)</th>
            <th>评分构成</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in qualityItems" :key="item.code">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td class="text-right">{{ item.price != null ? Number(item.price).toFixed(2) : '-' }}</td>
            <td class="text-right"><PnLBadge :value="(item.change_pct || 0) / 100" /></td>
            <td class="text-right"><span class="ia-screen__score">{{ item.score != null ? Number(item.score).toFixed(2) : '-' }}</span></td>
            <td class="text-right">{{ item.pe_ttm != null ? Number(item.pe_ttm).toFixed(2) : '-' }}</td>
            <td class="text-right">{{ item.pe_dynamic != null ? Number(item.pe_dynamic).toFixed(2) : '-' }}</td>
            <td class="text-right">{{ item.pb != null ? Number(item.pb).toFixed(2) : '-' }}</td>
            <td class="text-right">{{ item.roe != null ? Number(item.roe).toFixed(1) + '%' : '-' }}</td>
            <td class="text-right">{{ formatGrowth(item.profit_growth) }}</td>
            <td class="text-right">{{ item.total_mv_yi != null ? Number(item.total_mv_yi).toFixed(0) : '-' }}</td>
            <td class="ia-screen__parts">
              <NkTag v-for="[k, v] in nonZeroParts(item.score_parts)" :key="k" size="sm" :type="scoreTag(v)">
                {{ scoreLabel(k) }} {{ formatScore(v) }}
              </NkTag>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <NkEmpty v-if="!loading && currentItems.length === 0" description="暂无数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listDynamicPotential, listQualityStocks } from '@/api/ia'
import type { ScreenItem, DynamicPotentialResp, QualityStockResp } from '@/types/ia'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const activeTab = ref('potential')
const tabs = [
  { label: '潜力股', value: 'potential' },
  { label: '质量股', value: 'quality' },
]

const potentialItems = ref<ScreenItem[]>([])
const qualityItems = ref<ScreenItem[]>([])
const potentialMeta = ref<DynamicPotentialResp | null>(null)
const qualityMeta = ref<QualityStockResp | null>(null)
const potentialTop = ref(20)
const qualityTop = ref(30)
const minRoe = ref(10)
const maxPe = ref(35)

const currentItems = computed(() => activeTab.value === 'potential' ? potentialItems.value : qualityItems.value)

const scoreLabelMap: Record<string, string> = {
  roe: 'ROE',
  growth: '增速',
  cheap_pe: 'PE低',
  cheap_pb: 'PB低',
  size: '市值',
  momentum: '动量',
  trend: '趋势',
  funds: '资金流',
  low_vol: '低波',
}

function scoreLabel(k: string) { return scoreLabelMap[k] || k }

function scoreTag(v: number) {
  if (v >= 0.7) return 'success'
  if (v >= 0.4) return 'warning'
  return 'info'
}

function nonZeroParts(parts?: Record<string, number | undefined>): Array<[string, number]> {
  if (!parts) return []
  return Object.entries(parts).filter(([, v]) => v != null && v > 0) as Array<[string, number]>
}

function formatScore(v: any) {
  const n = Number(v)
  if (v == null || isNaN(n)) return '-'
  if (n === 0) return '0'
  return n.toFixed(3)
}

function formatGrowth(v: any) {
  const n = Number(v)
  if (v == null || isNaN(n)) return '-'
  if (Math.abs(n) >= 10000) {
    return (n / 100).toFixed(0) + '倍'
  }
  return n.toFixed(1) + '%'
}

function formatTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN')
}

async function loadPotential() {
  loading.value = true
  try {
    const res = await listDynamicPotential({ top: potentialTop.value })
    potentialMeta.value = res.data
    potentialItems.value = res.data?.items || []
  } catch (e) {
    potentialItems.value = []
    potentialMeta.value = null
  } finally {
    loading.value = false
  }
}

async function loadQuality() {
  loading.value = true
  try {
    const res = await listQualityStocks({
      top: qualityTop.value,
      min_roe: minRoe.value,
      max_pe: maxPe.value,
    })
    qualityMeta.value = res.data
    qualityItems.value = res.data?.items || []
  } catch (e) {
    qualityItems.value = []
    qualityMeta.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPotential()
  loadQuality()
})
</script>

<style lang="scss" scoped>
.ia-screen {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__meta {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-bottom: $nk-spacing-sm;
  }
  &__controls {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
      white-space: nowrap;
    }
    th {
      background: $nk-color-neutral-50;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
      font-size: $nk-font-size-sm;
    }
    td { color: $nk-color-neutral-800; }
    .text-right { text-align: right; }
  }
  &__parts {
    white-space: normal;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  &__score {
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-primary-600;
  }
}
</style>
