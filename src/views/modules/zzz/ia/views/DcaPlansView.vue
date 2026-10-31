<template>
  <div class="ia-dca">
    <div class="ia-dca__header">
      <h2 class="ia-dca__title">定投计划</h2>
      <NkButton type="primary" @click="dialogVisible = true">新建计划</NkButton>
    </div>
    <div class="ia-dca__filters">
      <NkSelect v-model="filters.status" :options="statusOptions" clearable placeholder="状态" @change="load" />
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-dca__table">
      <thead>
        <tr>
          <th>名称</th>
          <th>账户</th>
          <th>标的</th>
          <th class="text-right">金额</th>
          <th>频率</th>
          <th>执行日</th>
          <th>下次执行</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="plan in plans" :key="plan.id">
          <td>{{ plan.name }}</td>
          <td>{{ plan.account_id }}</td>
          <td>{{ plan.asset?.code || plan.asset_id }}</td>
          <td class="text-right">{{ plan.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</td>
          <td><NkTag>{{ cycleLabel(plan.cycle) }}</NkTag></td>
          <td>{{ formatExecDay(plan) }}</td>
          <td>{{ plan.next_exec_date }}</td>
          <td><NkTag :type="plan.status === 'active' ? 'success' : plan.status === 'paused' ? 'warning' : 'info'">{{ statusLabel(plan.status) }}</NkTag></td>
          <td>
            <div class="ia-dca__btns">
              <NkButton size="xs" @click="openEdit(plan)">编辑</NkButton>
              <NkButton size="xs" type="danger" @click="handleDelete(plan)">删除</NkButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && plans.length === 0" description="暂无定投计划" />

    <NkDialog v-model:visible="dialogVisible" :title="editingId ? '编辑计划' : '新建计划'" width="480px">
      <div class="ia-dca__form">
        <div class="ia-dca__field">
          <label class="ia-dca__label">名称 *</label>
          <NkInput v-model="form.name" placeholder="如 沪深300周定投" />
        </div>
        <div class="ia-dca__field">
          <label class="ia-dca__label">账户 *</label>
          <AccountSelector v-model="form.account_id" :clearable="false" />
        </div>
        <div class="ia-dca__field">
          <label class="ia-dca__label">标的 *</label>
          <AssetSearch v-model="form.asset_id" />
        </div>
        <div class="ia-dca__row">
          <div class="ia-dca__field">
            <label class="ia-dca__label">每期金额 *</label>
            <NkInput v-model.number="form.amount" type="number" />
          </div>
          <div class="ia-dca__field">
            <label class="ia-dca__label">频率 *</label>
            <NkSelect v-model="form.cycle" :options="cycleOptions" />
          </div>
        </div>
        <div v-if="form.cycle === 'weekly'" class="ia-dca__field">
          <label class="ia-dca__label">周几执行 (1-7)</label>
          <NkInput v-model.number="form.exec_day" type="number" placeholder="1" min="1" max="7" />
        </div>
        <div v-else-if="form.cycle === 'biweekly'" class="ia-dca__field">
          <label class="ia-dca__label">每月第几天 (1-28)</label>
          <NkInput v-model.number="form.exec_day" type="number" placeholder="15" min="1" max="28" />
        </div>
        <div v-else-if="form.cycle === 'monthly'" class="ia-dca__field">
          <label class="ia-dca__label">每月第几天 (1-28)</label>
          <NkInput v-model.number="form.exec_day" type="number" placeholder="1" min="1" max="28" />
        </div>
        <div v-else class="ia-dca__field">
          <label class="ia-dca__label">执行日 (1-28)</label>
          <NkInput v-model.number="form.exec_day" type="number" placeholder="1" min="1" max="28" />
        </div>
        <div class="ia-dca__row">
          <div class="ia-dca__field">
            <label class="ia-dca__label">起始日</label>
            <NkInput v-model="form.start_date" type="date" />
          </div>
          <div class="ia-dca__field">
            <label class="ia-dca__label">结束日</label>
            <NkInput v-model="form.end_date" type="date" />
          </div>
        </div>
        <div v-if="editingId" class="ia-dca__field">
          <label class="ia-dca__label">状态</label>
          <NkSelect v-model="form.status" :options="statusOptions" />
        </div>
        <div class="ia-dca__field">
          <label class="ia-dca__label">备注</label>
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
import { listDcaPlans, createDcaPlan, updateDcaPlan, deleteDcaPlan } from '@/api/ia'
import type { DcaPlan, CreateDcaPlanReq, UpdateDcaPlanReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'
import AccountSelector from '../common/AccountSelector.vue'
import AssetSearch from '../common/AssetSearch.vue'

const loading = ref(false)
const saving = ref(false)
const plans = ref<DcaPlan[]>([])

const filters = reactive({ status: '' })

const cycleOptions = [
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每两周', value: 'biweekly' },
  { label: '每月', value: 'monthly' },
]

const statusOptions = [
  { label: '执行中', value: 'active' },
  { label: '暂停', value: 'paused' },
  { label: '已完成', value: 'finished' },
]

const cycleMap: Record<string, string> = { daily: '每日', weekly: '每周', biweekly: '每两周', monthly: '每月' }
function cycleLabel(c: string) { return cycleMap[c] || c }
function statusLabel(s: string) {
  return s === 'active' ? '执行中' : s === 'paused' ? '暂停' : s === 'finished' ? '已完成' : s
}

function formatExecDay(plan: DcaPlan) {
  if (plan.cycle === 'weekly') return `周${['一','二','三','四','五','六','日'][plan.exec_day - 1] || '?'}`
  if (plan.cycle === 'monthly' || plan.cycle === 'biweekly') return `每月${plan.exec_day}日`
  return `第${plan.exec_day}天`
}

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive<CreateDcaPlanReq & UpdateDcaPlanReq & { status: string }>({
  name: '',
  account_id: '',
  asset_id: '',
  amount: 0,
  cycle: 'monthly',
  exec_day: 1,
  start_date: '',
  end_date: '',
  remark: '',
  status: 'active',
})

async function load() {
  loading.value = true
  try {
    const res = await listDcaPlans({ status: filters.status || undefined })
    plans.value = res.data || []
  } catch (e) {
    plans.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    name: '', account_id: '', asset_id: '',
    amount: 0, cycle: 'monthly', exec_day: 1,
    start_date: '', end_date: '', remark: '', status: 'active',
  })
  dialogVisible.value = true
}

function openEdit(p: DcaPlan) {
  editingId.value = p.id
  Object.assign(form, {
    name: p.name, account_id: p.account_id, asset_id: p.asset_id,
    amount: p.amount, cycle: p.cycle, exec_day: p.exec_day,
    start_date: p.start_date, end_date: p.end_date,
    remark: p.remark, status: p.status,
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.account_id || !form.asset_id || !form.amount) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateDcaPlan(editingId.value, {
        name: form.name, amount: form.amount, cycle: form.cycle,
        exec_day: form.exec_day, start_date: form.start_date,
        end_date: form.end_date, status: form.status, remark: form.remark,
      })
      NKMessage.success('已更新')
    } else {
      await createDcaPlan({
        name: form.name, account_id: form.account_id, asset_id: form.asset_id,
        amount: form.amount, cycle: form.cycle, exec_day: form.exec_day,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        remark: form.remark,
      })
      NKMessage.success('已创建')
    }
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(p: DcaPlan) {
  if (!confirm(`确定删除计划「${p.name}」？`)) return
  try {
    await deleteDcaPlan(p.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-dca {
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
    margin-bottom: $nk-spacing-lg;
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
  &__btns {
    display: flex;
    gap: $nk-spacing-xs;
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__row {
    display: flex;
    gap: $nk-spacing-md;
    & > * { flex: 1; }
  }
  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
}
</style>
