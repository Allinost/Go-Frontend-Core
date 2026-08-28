<template>
  <div class="ia-returns">
    <div class="ia-returns__header">
      <h2 class="ia-returns__title">收益率</h2>
      <div class="ia-returns__filters">
        <AccountSelector v-model="accountId" @change="load" />
        <DateRangePicker @change="handleRangeChange" />
      </div>
    </div>
    <NkLoading v-if="loading" />
      <div v-else-if="returns" class="ia-returns__content">
        <div class="ia-returns__cards">
          <NkCard>
            <template #header>简单收益率</template>
            <div class="ia-returns__metric">
              <span class="ia-returns__metric-value" :class="returns.simple_return >= 0 ? 'ia-positive' : 'ia-negative'">
                {{ (returns.simple_return * 100).toFixed(2) }}%
              </span>
            </div>
          </NkCard>
          <NkCard>
            <template #header>Modified Dietz</template>
            <div class="ia-returns__metric">
              <span class="ia-returns__metric-value" :class="returns.modified_dietz >= 0 ? 'ia-positive' : 'ia-negative'">
                {{ (returns.modified_dietz * 100).toFixed(2) }}%
              </span>
            </div>
          </NkCard>
          <NkCard v-if="returns.xirr !== undefined">
            <template #header>XIRR</template>
            <div class="ia-returns__metric">
              <span class="ia-returns__metric-value" :class="returns.xirr >= 0 ? 'ia-positive' : 'ia-negative'">
                {{ (returns.xirr * 100).toFixed(2) }}%
              </span>
            </div>
          </NkCard>
        </div>
        <div class="ia-returns__period">
          <span>统计区间: {{ returns.period_start }} ~ {{ returns.period_end }}</span>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getReturns } from '@/api/ia'
import type { ReturnsResp } from '@/types/ia'
import AccountSelector from '../common/AccountSelector.vue'
import DateRangePicker from '../common/DateRangePicker.vue'

const loading = ref(false)
const returns = ref<ReturnsResp | null>(null)
const accountId = ref('')
const startDate = ref('')
const endDate = ref('')

function handleRangeChange(start: string, end: string) {
  startDate.value = start
  endDate.value = end
  load()
}

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (accountId.value) params.account_id = accountId.value
    if (startDate.value) params.start = startDate.value
    if (endDate.value) params.end = endDate.value
    const res = await getReturns(params)
    returns.value = res.data
  } catch (e) {
    returns.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-returns {
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
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }
  &__metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $nk-spacing-md;
    &-value {
      font-size: $nk-font-size-3xl;
      font-weight: $nk-font-weight-bold;
    }
  }
  &__period {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    text-align: center;
  }
}
.ia-positive { color: $nk-color-success; }
.ia-negative { color: $nk-color-error; }
</style>
