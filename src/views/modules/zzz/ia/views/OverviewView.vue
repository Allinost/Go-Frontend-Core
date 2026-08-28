<template>
  <div class="ia-overview">
    <div class="ia-overview__header">
      <h2 class="ia-overview__title">资产总览</h2>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="overview" class="ia-overview__content">
        <div class="ia-overview__grand">
          <NkCard>
            <template #header>全局汇总</template>
            <div class="ia-overview__stats">
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总市值</span>
                <span class="ia-overview__stat-value">{{ formatMoney(overview.grand.total_value) }}</span>
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总成本</span>
                <span class="ia-overview__stat-value">{{ formatMoney(overview.grand.total_cost) }}</span>
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总盈亏</span>
                <PnLBadge :value="overview.grand.total_pnl" type="amount" />
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">盈亏比例</span>
                <PnLBadge :value="overview.grand.pnl_ratio" />
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">已实现盈亏</span>
                <PnLBadge :value="overview.grand.realized_pnl" type="amount" />
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">分红收入</span>
                <span class="ia-overview__stat-value">{{ formatMoney(overview.grand.dividend_income) }}</span>
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">现金余额</span>
                <span class="ia-overview__stat-value">{{ formatMoney(overview.grand.cash_balance) }}</span>
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总市值(CNY)</span>
                <span class="ia-overview__stat-value">{{ formatMoney(overview.grand.total_value_cny) }}</span>
              </div>
            </div>
          </NkCard>
        </div>
        <div class="ia-overview__accounts">
          <NkCard v-for="(acc, key) in overview.accounts" :key="key">
            <template #header>{{ key }}</template>
            <div class="ia-overview__stats">
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总市值</span>
                <span class="ia-overview__stat-value">{{ formatMoney(acc.total_value) }}</span>
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">总盈亏</span>
                <PnLBadge :value="acc.total_pnl" type="amount" />
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">盈亏比例</span>
                <PnLBadge :value="acc.pnl_ratio" />
              </div>
              <div class="ia-overview__stat">
                <span class="ia-overview__stat-label">现金余额</span>
                <span class="ia-overview__stat-value">{{ formatMoney(acc.cash_balance) }}</span>
              </div>
            </div>
          </NkCard>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOverview } from '@/api/ia'
import type { OverviewResp } from '@/types/ia'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const overview = ref<OverviewResp | null>(null)

function formatMoney(v: number | undefined | null): string {
  if (v == null) return '-'
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const res = await getOverview()
    overview.value = res.data || null
  } catch (e) {
    overview.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-overview {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__accounts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: $nk-spacing-lg;
    margin-top: $nk-spacing-lg;
  }
  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: $nk-spacing-md;
  }
  &__stat {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
    &-label {
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-500;
    }
    &-value {
      font-size: $nk-font-size-lg;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-900;
    }
  }
}
</style>
