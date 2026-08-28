<template>
  <div class="ia-fees">
    <div class="ia-fees__header">
      <h2 class="ia-fees__title">独立费用</h2>
      <NkButton type="primary" @click="openCreate">记录费用</NkButton>
    </div>
    <div class="ia-fees__filters">
      <AccountSelector v-model="filters.account_id" @change="load" />
      <NkInput v-model="filters.fee_type" placeholder="费用类型" size="sm" style="width: 160px" clearable @keyup.enter="load" />
      <NkInput v-model="filters.start" type="date" size="sm" />
      <NkInput v-model="filters.end" type="date" size="sm" />
      <NkButton size="sm" @click="load">搜索</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-fees__table">
      <thead>
        <tr>
          <th>账户</th>
          <th>费用类型</th>
          <th class="text-right">金额</th>
          <th>币种</th>
          <th>周期</th>
          <th>扣费日</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in fees" :key="f.id">
          <td>{{ f.account_id }}</td>
          <td>{{ f.fee_type }}</td>
          <td class="text-right"><PnLBadge :value="-Math.abs(f.amount)" type="amount" /></td>
          <td>{{ f.currency || '-' }}</td>
          <td>{{ f.period || '-' }}</td>
          <td>{{ f.charge_date || '-' }}</td>
          <td>{{ f.remark || '-' }}</td>
          <td><NkButton size="xs" type="danger" @click="handleDelete(f)">删除</NkButton></td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && fees.length === 0" description="暂无费用" />

    <NkDialog v-model:visible="dialogVisible" title="记录费用" width="420px">
      <div class="ia-fees__form">
        <div class="ia-fees__field">
          <label class="ia-fees__label">账户 *</label>
          <AccountSelector v-model="form.account_id" :clearable="false" />
        </div>
        <div class="ia-fees__field">
          <label class="ia-fees__label">费用类型 *</label>
          <NkInput v-model="form.fee_type" placeholder="如 管理费/托管费" />
        </div>
        <div class="ia-fees__row">
          <div class="ia-fees__field">
            <label class="ia-fees__label">金额 *</label>
            <NkInput v-model.number="form.amount" type="number" />
          </div>
          <div class="ia-fees__field">
            <label class="ia-fees__label">币种</label>
            <NkInput v-model="form.currency" placeholder="CNY" />
          </div>
        </div>
        <div class="ia-fees__row">
          <div class="ia-fees__field">
            <label class="ia-fees__label">周期</label>
            <NkInput v-model="form.period" placeholder="如 2024Q1" />
          </div>
          <div class="ia-fees__field">
            <label class="ia-fees__label">扣费日</label>
            <NkInput v-model="form.charge_date" type="date" />
          </div>
        </div>
        <div class="ia-fees__field">
          <label class="ia-fees__label">关联标的</label>
          <AssetSearch v-model="form.asset_id" />
        </div>
        <div class="ia-fees__field">
          <label class="ia-fees__label">备注</label>
          <NkTextarea v-model="form.remark" />
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
import { listFees, createFee, deleteFee } from '@/api/ia'
import type { FeeRecord, CreateFeeReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import AssetSearch from '../common/AssetSearch.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const saving = ref(false)
const fees = ref<FeeRecord[]>([])

const filters = reactive({ account_id: '', fee_type: '', start: '', end: '' })

const dialogVisible = ref(false)
const form = reactive<CreateFeeReq>({
  account_id: '',
  fee_type: '管理费',
  amount: 0,
  currency: 'CNY',
  period: '',
  charge_date: '',
  asset_id: '',
  remark: '',
})

async function load() {
  loading.value = true
  try {
    const res = await listFees({
      account_id: filters.account_id || undefined,
      fee_type: filters.fee_type || undefined,
      start: filters.start || undefined,
      end: filters.end || undefined,
    })
    fees.value = res.data || []
  } catch (e) {
    fees.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, {
    account_id: '', fee_type: '管理费', amount: 0,
    currency: 'CNY', period: '', charge_date: '', asset_id: '', remark: '',
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.account_id || !form.fee_type || !form.amount) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    await createFee({ ...form, amount: Math.abs(form.amount) })
    NKMessage.success('已记录')
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(f: FeeRecord) {
  if (!confirm('确定删除？')) return
  try {
    await deleteFee(f.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-fees {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__filters { display: flex; gap: $nk-spacing-sm; margin-bottom: $nk-spacing-lg; }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td { padding: $nk-spacing-sm $nk-spacing-md; border-bottom: 1px solid $nk-color-neutral-200; text-align: left; white-space: nowrap; }
    th { background: $nk-color-neutral-50; font-weight: $nk-font-weight-medium; color: $nk-color-neutral-600; font-size: $nk-font-size-sm; }
    td { color: $nk-color-neutral-800; }
    tr:hover td { background: $nk-color-neutral-50; }
    .text-right { text-align: right; }
  }
  &__form { display: flex; flex-direction: column; gap: $nk-spacing-md; }
  &__row { display: flex; gap: $nk-spacing-md; & > * { flex: 1; } }
  &__field { display: flex; flex-direction: column; gap: $nk-spacing-xs; }
  &__label { font-size: $nk-font-size-sm; color: $nk-color-neutral-600; font-weight: $nk-font-weight-medium; }
}
</style>
