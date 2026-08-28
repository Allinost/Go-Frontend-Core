<template>
  <div class="ia-cash">
    <div class="ia-cash__header">
      <h2 class="ia-cash__title">资金流水</h2>
      <NkButton type="primary" @click="openCreate">记录流水</NkButton>
    </div>
    <div class="ia-cash__filters">
      <AccountSelector v-model="filters.account_id" @change="load" />
      <NkSelect v-model="filters.flow_type" :options="flowTypeOptions" size="sm" clearable placeholder="类型" @change="load" />
      <NkInput v-model="filters.start" type="date" size="sm" placeholder="起始日期" />
      <NkInput v-model="filters.end" type="date" size="sm" placeholder="结束日期" />
      <NkButton size="sm" @click="load">搜索</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-cash__table">
      <thead>
        <tr>
          <th>账户</th>
          <th>类型</th>
          <th class="text-right">金额</th>
          <th>币种</th>
          <th>日期</th>
          <th>对手方</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cf in flows" :key="cf.id">
          <td>{{ cf.account_id }}</td>
          <td><NkTag :type="flowTypeTag(cf.flow_type)">{{ flowTypeLabel(cf.flow_type) }}</NkTag></td>
          <td class="text-right"><PnLBadge :value="cf.amount" type="amount" /></td>
          <td>{{ cf.currency || '-' }}</td>
          <td>{{ cf.flow_date }}</td>
          <td>{{ cf.counter_account_id || '-' }}</td>
          <td>{{ cf.remark || '-' }}</td>
          <td>
            <NkButton size="xs" type="danger" @click="handleDelete(cf)">删除</NkButton>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && flows.length === 0" description="暂无流水" />

    <NkDialog v-model:visible="dialogVisible" title="记录资金流水" width="480px">
      <div class="ia-cash__form">
        <div class="ia-cash__field">
          <label class="ia-cash__label">账户 *</label>
          <AccountSelector v-model="form.account_id" :clearable="false" />
        </div>
        <div class="ia-cash__field">
          <label class="ia-cash__label">类型 *</label>
          <NkSelect v-model="form.flow_type" :options="flowTypeOptions" />
        </div>
        <div class="ia-cash__row">
          <div class="ia-cash__field">
            <label class="ia-cash__label">金额 *</label>
            <NkInput v-model.number="form.amount" type="number" />
          </div>
          <div class="ia-cash__field">
            <label class="ia-cash__label">币种</label>
            <NkInput v-model="form.currency" placeholder="CNY" />
          </div>
        </div>
        <div v-if="form.flow_type === 'transfer_in' || form.flow_type === 'transfer_out'" class="ia-cash__field">
          <label class="ia-cash__label">对手方账户</label>
          <AccountSelector v-model="form.counter_account_id" />
        </div>
        <div class="ia-cash__field">
          <label class="ia-cash__label">日期</label>
          <NkInput v-model="form.flow_date" type="date" />
        </div>
        <div class="ia-cash__field">
          <label class="ia-cash__label">备注</label>
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
import { listCashFlows, createCashFlow, deleteCashFlow } from '@/api/ia'
import type { CashFlow, CreateCashFlowReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import PnLBadge from '../common/PnLBadge.vue'

const loading = ref(false)
const saving = ref(false)
const flows = ref<CashFlow[]>([])

const filters = reactive({ account_id: '', flow_type: '', start: '', end: '' })

const flowTypeOptions = [
  { label: '入金', value: 'deposit' },
  { label: '出金', value: 'withdraw' },
  { label: '划入', value: 'transfer_in' },
  { label: '划出', value: 'transfer_out' },
]
const flowTypeMap: Record<string, string> = { deposit: '入金', withdraw: '出金', transfer_in: '划入', transfer_out: '划出' }
function flowTypeLabel(t: string) { return flowTypeMap[t] || t }
function flowTypeTag(t: string) {
  if (t === 'deposit' || t === 'transfer_in') return 'success'
  if (t === 'withdraw' || t === 'transfer_out') return 'warning'
  return 'info'
}

const dialogVisible = ref(false)
const form = reactive<CreateCashFlowReq>({
  account_id: '',
  flow_type: 'deposit',
  amount: 0,
  currency: 'CNY',
  counter_account_id: '',
  flow_date: '',
  remark: '',
})

async function load() {
  loading.value = true
  try {
    const res = await listCashFlows({
      account_id: filters.account_id || undefined,
      flow_type: filters.flow_type || undefined,
      start: filters.start || undefined,
      end: filters.end || undefined,
    })
    flows.value = res.data || []
  } catch (e) {
    flows.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, {
    account_id: '', flow_type: 'deposit', amount: 0,
    currency: 'CNY', counter_account_id: '', flow_date: '', remark: '',
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.account_id || !form.flow_type || !form.amount) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    await createCashFlow({ ...form })
    NKMessage.success('已记录')
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(cf: CashFlow) {
  if (!confirm('确定删除该流水？')) return
  try {
    await deleteCashFlow(cf.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-cash {
  &__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $nk-spacing-lg; }
  &__title { font-size: $nk-font-size-xl; font-weight: $nk-font-weight-semibold; color: $nk-color-neutral-900; }
  &__filters { display: flex; gap: $nk-spacing-sm; margin-bottom: $nk-spacing-lg; }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
      white-space: nowrap;
    }
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
