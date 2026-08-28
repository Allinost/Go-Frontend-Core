<template>
  <div class="ia-trades-review">
    <div class="ia-trades-review__header">
      <h2 class="ia-trades-review__title">交易复盘</h2>
      <div class="ia-trades-review__filters">
        <AccountSelector v-model="accountId" @change="load" />
      </div>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="review" class="ia-trades-review__content">
        <div class="ia-trades-review__stats">
          <NkCard>
            <div class="ia-trades-review__stat">
              <span class="ia-trades-review__stat-label">总交易数</span>
              <span class="ia-trades-review__stat-value">{{ review.total_trades }}</span>
            </div>
          </NkCard>
          <NkCard>
            <div class="ia-trades-review__stat">
              <span class="ia-trades-review__stat-label">盈利交易</span>
              <span class="ia-trades-review__stat-value ia-positive">{{ review.win_trades }}</span>
            </div>
          </NkCard>
          <NkCard>
            <div class="ia-trades-review__stat">
              <span class="ia-trades-review__stat-label">亏损交易</span>
              <span class="ia-trades-review__stat-value ia-negative">{{ review.loss_trades }}</span>
            </div>
          </NkCard>
          <NkCard>
            <div class="ia-trades-review__stat">
              <span class="ia-trades-review__stat-label">平均持仓天数</span>
              <span class="ia-trades-review__stat-value">{{ review.avg_holding_days }}</span>
            </div>
          </NkCard>
        </div>
        <NkCard>
          <template #header>交易明细</template>
          <table class="ia-trades-review__table">
            <thead>
              <tr>
                <th>标的</th>
                <th>操作</th>
                <th class="text-right">份额</th>
                <th class="text-right">价格</th>
                <th class="text-right">金额</th>
                <th class="text-right">盈亏</th>
                <th class="text-right">持仓天数</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in review.items" :key="i">
                <td>{{ item.name }} ({{ item.code }})</td>
                <td><NkTag :type="item.action === 'buy' ? 'success' : 'danger'">{{ item.action === 'buy' ? '买入' : '卖出' }}</NkTag></td>
                <td class="text-right">{{ item.shares }}</td>
                <td class="text-right">{{ item.price?.toFixed(2) }}</td>
                <td class="text-right">{{ item.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</td>
                <td class="text-right"><PnLBadge :value="item.pnl" type="amount" /></td>
                <td class="text-right">{{ item.holding_days }}</td>
                <td>{{ formatTime(item.trade_at) }}</td>
              </tr>
            </tbody>
          </table>
        </NkCard>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTradesReview } from '@/api/ia'
import type { TradesReviewResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const review = ref<TradesReviewResp | null>(null)
const accountId = ref('')

function formatTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN')
}

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (accountId.value) params.account_id = accountId.value
    const res = await getTradesReview(params)
    review.value = res.data
  } catch (e) {
    review.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-trades-review {
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
  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }
  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $nk-spacing-xs;
    &-label { font-size: $nk-font-size-sm; color: $nk-color-neutral-500; }
    &-value { font-size: $nk-font-size-2xl; font-weight: $nk-font-weight-bold; color: $nk-color-neutral-900; }
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
}
.ia-positive { color: $nk-color-success; }
.ia-negative { color: $nk-color-error; }
</style>
