<template>
  <div class="ia-fx">
    <div class="ia-fx__header">
      <h2 class="ia-fx__title">汇率管理</h2>
      <div class="ia-fx__actions">
        <NkButton @click="runRefresh" :loading="refreshing">拉取最新汇率</NkButton>
        <NkButton type="primary" @click="openCreate">录入/更新汇率</NkButton>
      </div>
    </div>
    <div class="ia-fx__filters">
      <NkInput v-model="filters.base_ccy" placeholder="基准币种 CNY" size="sm" style="width: 160px" clearable @keyup.enter="load" />
      <NkInput v-model="filters.quote_ccy" placeholder="报价币种 USD" size="sm" style="width: 160px" clearable @keyup.enter="load" />
      <NkButton size="sm" @click="load">搜索</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-fx__table">
      <thead>
        <tr>
          <th>基准币种</th>
          <th>报价币种</th>
          <th class="text-right">汇率</th>
          <th>日期</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rates" :key="r.id">
          <td>{{ r.base_ccy }}</td>
          <td>{{ r.quote_ccy }}</td>
          <td class="text-right">{{ r.rate?.toFixed(4) }}</td>
          <td>{{ r.rate_date }}</td>
          <td><NkTag>{{ r.source || '-' }}</NkTag></td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && rates.length === 0" description="暂无汇率数据" />

    <NkDialog v-model:visible="dialogVisible" title="录入/更新汇率" width="380px">
      <div class="ia-fx__form">
        <div class="ia-fx__row">
          <div class="ia-fx__field">
            <label class="ia-fx__label">基准币种 *</label>
            <NkInput v-model="form.base_ccy" placeholder="CNY" />
          </div>
          <div class="ia-fx__field">
            <label class="ia-fx__label">报价币种 *</label>
            <NkInput v-model="form.quote_ccy" placeholder="USD" />
          </div>
        </div>
        <div class="ia-fx__field">
          <label class="ia-fx__label">汇率 *</label>
          <NkInput v-model.number="form.rate" type="number" placeholder="1 USD = 7.16 CNY 则填 7.16" />
        </div>
        <div class="ia-fx__field">
          <label class="ia-fx__label">日期</label>
          <NkInput v-model="form.rate_date" type="date" />
        </div>
        <div class="ia-fx__field">
          <label class="ia-fx__label">来源</label>
          <NkSelect v-model="form.source" :options="sourceOptions" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="dialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="saving" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listFxRates, upsertFxRate, runRefreshFx } from '@/api/ia'
import type { FxRate, UpsertFxRateReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const rates = ref<FxRate[]>([])

const filters = reactive({ base_ccy: '', quote_ccy: '' })

const sourceOptions = [
  { label: '手工', value: 'manual' },
  { label: '自动', value: 'auto' },
]

const dialogVisible = ref(false)
const form = reactive<UpsertFxRateReq>({
  base_ccy: 'CNY',
  quote_ccy: 'USD',
  rate: 0,
  rate_date: '',
  source: 'manual',
})

async function load() {
  loading.value = true
  try {
    const res = await listFxRates({
      base_ccy: filters.base_ccy || undefined,
      quote_ccy: filters.quote_ccy || undefined,
    })
    rates.value = res.data || []
  } catch (e) {
    rates.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, {
    base_ccy: 'CNY', quote_ccy: 'USD', rate: 0,
    rate_date: new Date().toISOString().slice(0, 10), source: 'manual',
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.base_ccy || !form.quote_ccy || !form.rate) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    await upsertFxRate(form)
    NKMessage.success('已保存')
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function runRefresh() {
  refreshing.value = true
  try {
    const res = await runRefreshFx()
    const r = res.data
    if (r?.updated?.length) NKMessage.success(`已更新 ${r.updated.length} 条汇率`)
    else NKMessage.success('已刷新')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-fx {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__actions { display: flex; gap: $nk-spacing-sm; }
  &__filters { display: flex; gap: $nk-spacing-sm; margin-bottom: $nk-spacing-lg; }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: $nk-spacing-sm $nk-spacing-md; border-bottom: 1px solid $nk-color-neutral-200; text-align: left; white-space: nowrap; }
    th { background: $nk-color-neutral-50; font-weight: $nk-font-weight-medium; color: $nk-color-neutral-600; font-size: $nk-font-size-sm; }
    td { color: $nk-color-neutral-800; }
    .text-right { text-align: right; }
  }
  &__form { display: flex; flex-direction: column; gap: $nk-spacing-md; }
  &__row { display: flex; gap: $nk-spacing-md; & > * { flex: 1; } }
  &__field { display: flex; flex-direction: column; gap: $nk-spacing-xs; }
  &__label { font-size: $nk-font-size-sm; color: $nk-color-neutral-600; font-weight: $nk-font-weight-medium; }
}
</style>
