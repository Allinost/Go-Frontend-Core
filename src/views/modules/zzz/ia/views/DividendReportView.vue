<template>
  <div class="ia-dividends">
    <div class="ia-dividends__header">
      <h2 class="ia-dividends__title">分红报告</h2>
      <div class="ia-dividends__filters">
        <AccountSelector v-model="accountId" @change="load" />
        <NkInput v-model="start" type="date" size="sm" />
        <NkInput v-model="end" type="date" size="sm" />
        <NkButton size="sm" @click="load">刷新</NkButton>
      </div>
    </div>
    <NkLoading v-if="loading" />
    <div v-else-if="data" class="ia-dividends__content">
      <div class="ia-dividends__cards">
        <NkCard>
          <template #header>合计</template>
          <div class="ia-dividends__stats">
            <div class="ia-dividends__stat"><span>税前总额</span><span>{{ formatMoney(data.total_gross) }}</span></div>
            <div class="ia-dividends__stat"><span>税后总额</span><span>{{ formatMoney(data.total_net) }}</span></div>
            <div class="ia-dividends__stat"><span>税费</span><span>{{ formatMoney(data.total_tax) }}</span></div>
            <div class="ia-dividends__stat"><span>红利再投次数</span><span>{{ data.reinvest_count }}</span></div>
            <div class="ia-dividends__stat"><span>YOC (近12月)</span><span>{{ (data.yield_on_cost * 100).toFixed(2) }}%</span></div>
          </div>
        </NkCard>
      </div>
      <NkCard>
        <template #header>分红标的排行</template>
        <table class="ia-dividends__table">
          <thead>
            <tr><th>标的</th><th class="text-right">税前</th><th class="text-right">税后</th><th class="text-right">次数</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in data.by_asset" :key="i">
              <td>{{ row.code || row.name || '-' }}</td>
              <td class="text-right">{{ formatMoney(row.gross) }}</td>
              <td class="text-right">{{ formatMoney(row.net) }}</td>
              <td class="text-right">{{ row.count }}</td>
            </tr>
            <tr v-if="!data.by_asset?.length"><td colspan="4" class="ia-dividends__empty">暂无数据</td></tr>
          </tbody>
        </table>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDividendReport } from '@/api/ia'
import type { DividendReportResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'

const loading = ref(false)
const data = ref<DividendReportResp | null>(null)
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
    const res = await getDividendReport({
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
.ia-dividends {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__filters { display: flex; gap: $nk-spacing-sm; }
  &__cards { display: grid; grid-template-columns: 1fr; gap: $nk-spacing-lg; margin-bottom: $nk-spacing-lg; }
  &__stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: $nk-spacing-md; }
  &__stat { display: flex; flex-direction: column; gap: $nk-spacing-xs; font-size: $nk-font-size-sm; }
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
