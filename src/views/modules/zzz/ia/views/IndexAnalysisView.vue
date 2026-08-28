<template>
  <div class="ia-index">
    <div class="ia-index__header">
      <h2 class="ia-index__title">指数分析</h2>
      <div class="ia-index__filters">
        <NkSelect v-model="selectedIndexes" :options="indexOptions" multiple placeholder="选择指数" />
        <NkSelect v-model="years" :options="yearOptions" @change="load" />
        <NkButton @click="load">刷新</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="data" class="ia-index__grid">
      <NkCard v-for="item in data.items" :key="item.secid || item.name">
        <template #header>{{ item.name }} <NkTag v-if="item.secid" size="sm" type="info">{{ item.secid }}</NkTag></template>
        <div v-if="item.error" class="ia-index__error">{{ item.error }}</div>
        <div v-else class="ia-index__card-body">
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">最新点位</span>
            <span class="ia-index__metric-value">{{ item.latest?.toFixed(2) }}</span>
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">年初至今</span>
            <PnLBadge :value="item.change_ytd / 100" />
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">趋势</span>
            <NkTag :type="item.trend === '上升' ? 'success' : item.trend === '下降' ? 'danger' : 'info'">{{ item.trend }}</NkTag>
          </div>
          <div class="ia-index__ma">
            <span :class="item.above_ma20 ? 'ia-ma--up' : 'ia-ma--down'">MA20 {{ item.above_ma20 ? '✓' : '✗' }}</span>
            <span :class="item.above_ma60 ? 'ia-ma--up' : 'ia-ma--down'">MA60 {{ item.above_ma60 ? '✓' : '✗' }}</span>
            <span :class="item.above_ma120 ? 'ia-ma--up' : 'ia-ma--down'">MA120 {{ item.above_ma120 ? '✓' : '✗' }}</span>
            <span :class="item.above_ma250 ? 'ia-ma--up' : 'ia-ma--down'">MA250 {{ item.above_ma250 ? '✓' : '✗' }}</span>
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">分位</span>
            <div class="ia-index__progress">
              <div class="ia-index__progress-bar" :style="{ width: (item.percentile * 100) + '%' }" />
            </div>
            <span>{{ (item.percentile * 100).toFixed(0) }}%</span>
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">年化收益</span>
            <PnLBadge :value="item.ann_return" />
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">年化波动</span>
            <span>{{ (item.ann_vol * 100).toFixed(2) }}%</span>
          </div>
          <div class="ia-index__metric">
            <span class="ia-index__metric-label">最大回撤</span>
            <span class="ia-negative">{{ (item.max_drawdown * 100).toFixed(2) }}%</span>
          </div>
          <div v-if="item.samples" class="ia-index__metric">
            <span class="ia-index__metric-label">样本数</span>
            <span>{{ item.samples }}</span>
          </div>
        </div>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getIndexAnalysis } from '@/api/ia'
import type { IndexAnalysisResp } from '@/types/ia'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const data = ref<IndexAnalysisResp | null>(null)
const selectedIndexes = ref(['NASDAQ100', 'NASDAQ', 'SP500', 'STAR50', 'CSI300'])
const years = ref(3)

const indexOptions = [
  { label: '纳斯达克100', value: 'NASDAQ100' },
  { label: '纳斯达克综合', value: 'NASDAQ' },
  { label: '标普500', value: 'SP500' },
  { label: '科创50', value: 'STAR50' },
  { label: '沪深300', value: 'CSI300' },
  { label: '中证500', value: 'CSI500' },
  { label: '中证1000', value: 'CSI1000' },
  { label: '上证指数', value: 'SSE' },
  { label: '深证成指', value: 'SZSE' },
  { label: '创业板指', value: 'GEM' },
]

const yearOptions = [
  { label: '1年', value: 1 },
  { label: '3年', value: 3 },
  { label: '5年', value: 5 },
  { label: '10年', value: 10 },
]

async function load() {
  loading.value = true
  try {
    const res = await getIndexAnalysis({
      indexes: selectedIndexes.value.join(','),
      years: years.value,
    })
    data.value = res.data
  } catch (e) {
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-index {
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
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: $nk-spacing-lg;
  }
  &__card-body {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
  }
  &__error {
    color: $nk-color-error;
    font-size: $nk-font-size-sm;
    padding: $nk-spacing-md;
    background: color-mix(in srgb, $nk-color-error 6%, transparent);
    border-radius: $nk-radius-sm;
  }
  &__metric {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: $nk-font-size-sm;
    &-label { color: $nk-color-neutral-500; }
    &-value { font-size: $nk-font-size-lg; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  }
  &__ma {
    display: flex;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;
    flex-wrap: wrap;
  }
  &__progress {
    flex: 1;
    max-width: 120px;
    height: 6px;
    background: $nk-color-neutral-200;
    border-radius: 3px;
    overflow: hidden;
    &-bar {
      height: 100%;
      background: $nk-color-primary-500;
      border-radius: 3px;
    }
  }
}
.ia-ma--up { color: $nk-color-success; }
.ia-ma--down { color: $nk-color-error; }
.ia-negative { color: $nk-color-error; }
</style>
