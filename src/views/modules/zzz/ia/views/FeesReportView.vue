<template>
  <div class="ia-fees-report">
    <div class="ia-fees-report__header">
      <h2 class="ia-fees-report__title">费用报告</h2>
      <div class="ia-fees-report__filters">
        <AccountSelector v-model="accountId" @change="load" />
        <NkInput v-model="start" type="date" size="sm" />
        <NkInput v-model="end" type="date" size="sm" />
        <NkButton size="sm" @click="load">刷新</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="data" class="ia-fees-report__content">
      <div class="ia-fees-report__cards">
        <NkCard>
          <template #header>合计</template>
          <div class="ia-fees-report__stats">
            <div class="ia-fees-report__stat"><span>总费用</span><span>{{ formatMoney(data.grand) }}</span></div>
            <div class="ia-fees-report__stat"><span>交易费税</span><span>{{ formatMoney((data.total_trade_fees || 0) + (data.total_trade_tax || 0)) }}</span></div>
            <div class="ia-fees-report__stat"><span>独立费用</span><span>{{ formatMoney(data.total_standalone) }}</span></div>
            <div class="ia-fees-report__stat"><span>资产侵蚀度</span><span>{{ (data.drag_ratio * 100).toFixed(3) }}%</span></div>
            <div class="ia-fees-report__stat"><span>资产基数</span><span>{{ formatMoney(data.base_value) }}</span></div>
          </div>
        </NkCard>
        <NkCard v-if="data.standalone_by_type">
          <template #header>独立费用分类</template>
          <div class="ia-fees-report__by-type">
            <div v-for="(v, k) in data.standalone_by_type" :key="k" class="ia-fees-report__row">
              <span>{{ k }}</span>
              <span>{{ formatMoney(v) }}</span>
            </div>
          </div>
        </NkCard>
      </div>
      <NkCard>
        <template #header>年度分布</template>
        <table class="ia-fees-report__table">
          <thead>
            <tr><th>年份</th><th class="text-right">交易费</th><th class="text-right">交易税</th><th class="text-right">独立费用</th><th class="text-right">合计</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in data.by_year" :key="i">
              <td>{{ row.year || row.period }}</td>
              <td class="text-right">{{ formatMoney(row.trade_fees) }}</td>
              <td class="text-right">{{ formatMoney(row.trade_tax) }}</td>
              <td class="text-right">{{ formatMoney(row.standalone) }}</td>
              <td class="text-right">{{ formatMoney(row.total) }}</td>
            </tr>
            <tr v-if="!data.by_year?.length"><td colspan="5" class="ia-fees-report__empty">暂无数据</td></tr>
          </tbody>
        </table>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFeesReport } from '@/api/ia'
import type { FeesReportResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'

const loading = ref(false)
const data = ref<FeesReportResp | null>(null)
const accountId = ref('')
const start = ref('')
const end = ref('')

function formatMoney(v: any) {
  if (v == null) return '-'
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const res = await getFeesReport({
      account_id: accountId.value || undefined,
      start: start.value || undefined,
      end: end.value || undefined,
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
.ia-fees-report {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__filters { display: flex; gap: $nk-spacing-sm; }
  &__cards { display: grid; grid-template-columns: 1fr 1fr; gap: $nk-spacing-lg; margin-bottom: $nk-spacing-lg; }
  &__stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: $nk-spacing-md; }
  &__stat { display: flex; flex-direction: column; gap: $nk-spacing-xs; font-size: $nk-font-size-sm; }
  &__by-type { display: flex; flex-direction: column; gap: $nk-spacing-xs; }
  &__row { display: flex; justify-content: space-between; font-size: $nk-font-size-sm; padding: 4px 0; border-bottom: 1px solid $nk-color-neutral-100; }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: $nk-spacing-sm $nk-spacing-md; border-bottom: 1px solid $nk-color-neutral-200; text-align: left; }
    th { background: $nk-color-neutral-50; font-weight: $nk-font-weight-medium; color: $nk-color-neutral-600; font-size: $nk-font-size-sm; }
    .text-right { text-align: right; }
  }
  &__empty { text-align: center; color: $nk-color-neutral-400; padding: $nk-spacing-lg; }
}
</style>
