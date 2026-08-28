<template>
  <div class="ia-risk">
    <div class="ia-risk__header">
      <h2 class="ia-risk__title">风险指标</h2>
      <div class="ia-risk__filters">
        <AccountSelector v-model="accountId" @change="load" />
      </div>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="risk" class="ia-risk__content">
        <div class="ia-risk__cards">
          <NkCard>
            <template #header>最大回撤</template>
            <div class="ia-risk__metric">
              <span class="ia-risk__metric-value ia-risk__metric-value--error">{{ (risk.max_drawdown * 100).toFixed(2) }}%</span>
              <span class="ia-risk__metric-detail">{{ risk.mdd_peak_date }} → {{ risk.mdd_trough_date }}</span>
            </div>
          </NkCard>
          <NkCard>
            <template #header>年化波动率</template>
            <div class="ia-risk__metric">
              <span class="ia-risk__metric-value">{{ (risk.annual_volatility * 100).toFixed(2) }}%</span>
            </div>
          </NkCard>
          <NkCard>
            <template #header>持仓集中度</template>
            <div class="ia-risk__metric">
              <div class="ia-risk__metric-row"><span>最大持仓占比</span><span>{{ (risk.top1_weight * 100).toFixed(2) }}%</span></div>
              <div class="ia-risk__metric-row"><span>前5持仓占比</span><span>{{ (risk.top5_weight * 100).toFixed(2) }}%</span></div>
              <div class="ia-risk__metric-row"><span>HHI指数</span><span>{{ risk.hhi?.toFixed(4) }}</span></div>
            </div>
          </NkCard>
        </div>
        <NkCard>
          <template #header>持仓分布</template>
          <table class="ia-risk__table">
            <thead>
              <tr>
                <th>标的</th>
                <th class="text-right">占比</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in risk.concentration" :key="c.code">
                <td>{{ c.name }} ({{ c.code }})</td>
                <td class="text-right">{{ (c.weight * 100).toFixed(2) }}%</td>
                <td><NkTag :type="c.breach ? 'danger' : 'success'">{{ c.breach ? '超限' : '正常' }}</NkTag></td>
              </tr>
            </tbody>
          </table>
        </NkCard>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRiskMetrics } from '@/api/ia'
import type { RiskMetricsResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'

const loading = ref(false)
const risk = ref<RiskMetricsResp | null>(null)
const accountId = ref('')

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (accountId.value) params.account_id = accountId.value
    const res = await getRiskMetrics(params)
    risk.value = res.data
  } catch (e) {
    risk.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-risk {
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
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }
  &__metric {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
    &-value {
      font-size: $nk-font-size-2xl;
      font-weight: $nk-font-weight-bold;
      color: $nk-color-neutral-900;
      &--error { color: $nk-color-error; }
    }
    &-detail {
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-500;
    }
    &-row {
      display: flex;
      justify-content: space-between;
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-700;
    }
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
    }
    th {
      background: $nk-color-neutral-50;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
      font-size: $nk-font-size-sm;
    }
    .text-right { text-align: right; }
  }
}
</style>
