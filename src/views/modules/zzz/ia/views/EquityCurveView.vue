<template>
  <div class="ia-equity">
    <div class="ia-equity__header">
      <h2 class="ia-equity__title">收益曲线</h2>
      <div class="ia-equity__filters">
        <AccountSelector v-model="accountId" @change="load" />
        <NkSelect v-model="benchmark" :options="benchmarkOptions" @change="load" />
        <DateRangePicker @change="handleRangeChange" />
      </div>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="curve" class="ia-equity__content">
        <NkCard>
          <template #header>净值走势</template>
          <div class="ia-equity__chart-placeholder">
            <p>图表数据点: {{ curve.points?.length || 0 }} 条</p>
            <p>基准: {{ curve.benchmark_name }} ({{ curve.benchmark?.length || 0 }} 条)</p>
            <p class="ia-equity__hint">前端需集成图表库（如 ECharts）渲染折线图</p>
          </div>
        </NkCard>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getEquityCurve } from '@/api/ia'
import type { EquityCurveResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'
import DateRangePicker from '../common/DateRangePicker.vue'

const loading = ref(false)
const curve = ref<EquityCurveResp | null>(null)
const accountId = ref('')
const benchmark = ref('CSI300')
const startDate = ref('')
const endDate = ref('')

const benchmarkOptions = [
  { label: '沪深300', value: 'CSI300' },
  { label: '中证500', value: 'CSI500' },
  { label: '中证1000', value: 'CSI1000' },
  { label: '上证指数', value: 'SSE' },
  { label: '深证成指', value: 'SZSE' },
  { label: '创业板指', value: 'GEM' },
  { label: '纳斯达克100', value: 'NASDAQ100' },
  { label: '纳斯达克综合', value: 'NASDAQ' },
  { label: '标普500', value: 'SP500' },
  { label: '科创50', value: 'STAR50' },
]

function handleRangeChange(start: string, end: string) {
  startDate.value = start
  endDate.value = end
  load()
}

async function load() {
  loading.value = true
  try {
    const params: any = { benchmark: benchmark.value }
    if (accountId.value) params.account_id = accountId.value
    if (startDate.value) params.start = startDate.value
    if (endDate.value) params.end = endDate.value
    const res = await getEquityCurve(params)
    curve.value = res.data
  } catch (e) {
    curve.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-equity {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
    flex-wrap: wrap;
    gap: $nk-spacing-sm;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
  }
  &__chart-placeholder {
    padding: $nk-spacing-xl;
    text-align: center;
    color: $nk-color-neutral-500;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $nk-spacing-sm;
  }
  &__hint {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-400;
  }
}
</style>
