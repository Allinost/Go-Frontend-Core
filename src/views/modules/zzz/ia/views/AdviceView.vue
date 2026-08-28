<template>
  <div class="ia-advice">
    <div class="ia-advice__header">
      <h2 class="ia-advice__title">买卖建议</h2>
      <div class="ia-advice__filters">
        <AccountSelector v-model="accountId" @change="load" />
      </div>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="advice" class="ia-advice__meta">
        <span>生成时间: {{ formatTime(advice.generated_at) }}</span>
        <span>范围: {{ advice.scope }}</span>
      </div>
      <NkTabs v-model="activeTab" :items="tabs" />
      <div class="ia-advice__list">
        <div v-for="item in filteredItems" :key="item.asset_id" class="ia-advice__card" :class="`ia-advice__card--${item.action}`">
          <div class="ia-advice__card-header">
            <span class="ia-advice__card-name">{{ item.name }}</span>
            <span class="ia-advice__card-code">{{ item.code }}</span>
            <NkTag :type="actionTag(item.action)">{{ actionLabel(item.action) }}</NkTag>
            <span class="ia-advice__card-confidence">[{{ item.confidence }}]</span>
          </div>
          <div class="ia-advice__card-body">
            <div class="ia-advice__card-row">
              <span>成本 {{ item.cost_price?.toFixed(2) }}</span>
              <span>最新 {{ item.last_price?.toFixed(2) }}</span>
              <PnLBadge :value="item.pnl_ratio" />
            </div>
            <div v-if="item.target_price > 0" class="ia-advice__card-row">
              <span>目标 {{ item.target_price?.toFixed(2) }}</span>
              <div class="ia-advice__progress">
                <div class="ia-advice__progress-bar" :style="{ width: Math.min(item.target_progress, 100) + '%' }" />
              </div>
              <span :class="{ 'ia-advice__progress-over': item.target_progress > 100 }">
                {{ item.target_progress > 100 ? '已超越目标' : item.target_progress + '%' }}
              </span>
            </div>
            <div v-else class="ia-advice__card-row">
              <span>目标 未设置</span>
            </div>
            <div v-if="item.asset_type === 'stock'" class="ia-advice__card-row">
              <span :class="item.above_ma20 ? 'ia-ma--up' : 'ia-ma--down'">MA20 {{ item.above_ma20 ? '✓' : '✗' }}</span>
              <span :class="item.above_ma60 ? 'ia-ma--up' : 'ia-ma--down'">MA60 {{ item.above_ma60 ? '✓' : '✗' }}</span>
            </div>
            <div class="ia-advice__reasons">
              <div v-for="(reason, i) in item.reasons" :key="i" class="ia-advice__reason">
                [{{ i + 1 }}] {{ reason }}
              </div>
            </div>
          </div>
        </div>
        <NkEmpty v-if="filteredItems.length === 0" description="无匹配建议" />
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAdvice } from '@/api/ia'
import type { TradeAdviceResp, TradeAdviceItem } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const advice = ref<TradeAdviceResp | null>(null)
const accountId = ref('')
const activeTab = ref('all')

const tabs = computed(() => {
  if (!advice.value) return []
  return [
    { label: `全部(${advice.value.items.length})`, value: 'all' },
    { label: `买入(${advice.value.buy_count})`, value: 'buy' },
    { label: `持有(${advice.value.hold_count})`, value: 'hold' },
    { label: `观望(${(advice.value.items.filter((i) => i.action === 'watch')).length})`, value: 'watch' },
    { label: `减持(${advice.value.reduce_count})`, value: 'reduce' },
    { label: `卖出(${advice.value.sell_count})`, value: 'sell' },
  ]
})

const filteredItems = computed(() => {
  if (!advice.value) return []
  if (activeTab.value === 'all') return advice.value.items
  return advice.value.items.filter((i) => i.action === activeTab.value)
})

const actionLabelMap: Record<string, string> = {
  buy: '买入', hold: '持有', watch: '观望', reduce: '减持', sell: '卖出',
}
const actionTagMap: Record<string, any> = {
  buy: 'success', hold: 'info', watch: 'warning', reduce: 'warning', sell: 'danger',
}

function actionLabel(a: string) { return actionLabelMap[a] || a }
function actionTag(a: string) { return actionTagMap[a] || 'info' }

function formatTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (accountId.value) params.account_id = accountId.value
    const res = await getAdvice(params)
    advice.value = res.data
  } catch (e) {
    advice.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-advice {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__meta {
    display: flex;
    gap: $nk-spacing-lg;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-bottom: $nk-spacing-md;
  }
  &__list {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__card {
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-md;
    &--buy { border-left: 3px solid $nk-color-success; }
    &--hold { border-left: 3px solid $nk-color-neutral-400; }
    &--watch { border-left: 3px solid $nk-color-warning; }
    &--reduce { border-left: 3px solid #f97316; }
    &--sell { border-left: 3px solid $nk-color-error; }
  }
  &__card-header {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-sm;
  }
  &__card-name {
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__card-code {
    color: $nk-color-neutral-500;
    font-size: $nk-font-size-sm;
  }
  &__card-confidence {
    margin-left: auto;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    background: $nk-color-neutral-100;
    padding: 2px 8px;
    border-radius: $nk-radius-sm;
  }
  &__card-body {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__card-row {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }
  &__progress {
    flex: 1;
    max-width: 200px;
    height: 6px;
    background: $nk-color-neutral-200;
    border-radius: 3px;
    overflow: hidden;
    &-bar {
      height: 100%;
      background: $nk-color-primary-500;
      border-radius: 3px;
    }
    &-over { color: $nk-color-success; font-weight: $nk-font-weight-medium; }
  }
  &__reasons {
    margin-top: $nk-spacing-xs;
  }
  &__reason {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    padding: 2px 0;
  }
}
.ia-ma--up { color: $nk-color-success; }
.ia-ma--down { color: $nk-color-error; }
</style>
